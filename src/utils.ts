import { QCItem, QCItemResult, InspectionRun } from './types';

/**
 * Đánh giá kết quả của một giá trị đo mẫu lẻ
 */
export function evalSample(value: string | undefined, item: QCItem): 'OK' | 'Cận Min' | 'Cận Max' | 'NG' | '' {
  if (value === undefined || value === null || value.trim() === '') {
    return '';
  }

  // Nếu không phải là đo số lượng (ví dụ mốc ngoại quan, text), mặc định dựa trên phán đoán chữ
  if (!item.isNumerical) {
    const valUpper = value.toUpperCase().trim();
    if (valUpper === 'OK' || valUpper === 'ĐẠT' || valUpper === 'PASS') return 'OK';
    if (valUpper === 'NG' || valUpper === 'LỖI' || valUpper === 'FAIL') return 'NG';
    
    // Nếu là chuỗi chữ mô tả tốt, tự phán đoán xem có chứa bavia, nứt lồi thủng hay không
    const lower = value.toLowerCase();
    if (lower.includes('ng') || lower.includes('lỗi') || lower.includes('hư') || lower.includes('thủng') || lower.includes('bavia') || lower.includes('trầy')) {
      return 'NG';
    }
    return 'OK';
  }

  const v = parseFloat(value);
  if (isNaN(v)) {
    return '';
  }

  const min = item.minLimit ?? 0;
  const max = item.maxLimit ?? 0;

  // Nếu vượt ngoài dải Min Max -> NG chắc chắn
  if (v < min || v > max) {
    return 'NG';
  }

  // Tính dải dung sai (tolerance range)
  const toleranceRange = parseFloat((max - min).toFixed(4));

  // Tính khoảng cách thực tế từ giá trị đo v tới các biên
  const distToMin = parseFloat(Math.abs(v - min).toFixed(4));
  const distToMax = parseFloat(Math.abs(v - max).toFixed(4));

  // Giới hạn khoảng cách cận biên tối đa không vượt quá 20% dải dung sai tổng (thay vì 35%)
  const maxAllowedDelta = parseFloat((toleranceRange * 0.20).toFixed(4));

  let appliedDeltaMin = toleranceRange <= 0.1001 ? 0.05 : 0.1;
  let appliedDeltaMax = toleranceRange <= 0.1001 ? 0.05 : 0.1;

  // Nếu người dùng có cấu hình ghi đè cảnh báo thủ công
  if (item.warningOffsetMin !== undefined && item.warningOffsetMin !== null) {
    appliedDeltaMin = item.warningOffsetMin;
  }
  if (item.warningOffsetMax !== undefined && item.warningOffsetMax !== null) {
    appliedDeltaMax = item.warningOffsetMax;
  }

  // Khống chế khoa học để delta cảnh báo không vượt quá maxAllowedDelta giới hạn
  if (appliedDeltaMin > maxAllowedDelta) {
    appliedDeltaMin = maxAllowedDelta;
  }
  if (appliedDeltaMax > maxAllowedDelta) {
    appliedDeltaMax = maxAllowedDelta;
  }

  const hasMinConstraint = item.nominal !== 0 && item.toleranceMin !== undefined && item.toleranceMin < 0;

  if (hasMinConstraint && appliedDeltaMin > 0 && distToMin <= appliedDeltaMin && distToMin < distToMax) {
    return 'Cận Min';
  }

  if (appliedDeltaMax > 0 && distToMax <= appliedDeltaMax && distToMax < distToMin) {
    return 'Cận Max';
  }

  return 'OK';
}

/**
 * Đánh giá kết quả tổng hợp của tất cả các mẫu trong 1 mốc đo
 */
export function evalSummary(result: QCItemResult | undefined, item: QCItem): 'OK' | 'Cận Min' | 'Cận Max' | 'NG' | 'CHƯA ĐO' {
  if (!result) return 'CHƯA ĐO';

  // Với mốc đánh giá thủ công hoặc ngoại quan
  if (!item.isNumerical) {
    if (result.manualStatus) {
      if (result.manualStatus === 'OK') return 'OK';
      if (result.manualStatus === 'NG') return 'NG';
      if (result.manualStatus === 'Cận Min') return 'Cận Min';
      if (result.manualStatus === 'Cận Max') return 'Cận Max';
    }
    
    // Nếu có giá trị text ở sample1, tự động đánh giá
    if (result.sample1 && result.sample1.trim() !== '') {
      const lowerText = result.sample1.toLowerCase();
      if (lowerText.includes('ng') || lowerText.includes('lỗi') || lowerText.includes('không đạt') || lowerText.includes('thủng') || lowerText.includes('bể') || lowerText.includes('bavia')) {
        return 'NG';
      }
      return 'OK';
    }
    return 'CHƯA ĐO';
  }

  // Thu thập các giá trị đo mẫu (Hỗ trợ 4 Cavity/Mẫu)
  const samples = [result.sample1, result.sample2, result.sample3, result.sample4].filter(s => s !== undefined && s !== null && s.trim() !== '');
  if (samples.length === 0) return 'CHƯA ĐO';

  let hasNG = false;
  let hasWarningMin = false;
  let hasWarningMax = false;

  for (const sample of samples) {
    const status = evalSample(sample, item);
    if (status === 'NG') hasNG = true;
    if (status === 'Cận Min') hasWarningMin = true;
    if (status === 'Cận Max') hasWarningMax = true;
  }

  if (hasNG) return 'NG';
  if (hasWarningMin) return 'Cận Min';
  if (hasWarningMax) return 'Cận Max';
  return 'OK';
}

/**
 * Sinh ID ngẫu nhiên
 */
export function generateId(): string {
  return 'run-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Chuyển đổi trang đầu tiên của file PDF thành hình ảnh Base64 (PNG) sử dụng PDF.js
 */
export async function convertPdfToImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      reject(new Error("Không tìm thấy thư viện PDF.js hoặc thư viện chưa tải xong. Vui lòng tải lại trang và thử lại!"));
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: typedarray });
        const pdf = await loadingTask.promise;
        
        if (pdf.numPages === 0) {
          reject(new Error("Tài liệu PDF không có trang nào!"));
          return;
        }

        const page = await pdf.getPage(1);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error("Môi trường trình duyệt không hỗ trợ Canvas 2D"));
          return;
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err: any) {
        console.error("Lỗi khi chuyển đổi trang PDF sang ảnh:", err);
        reject(new Error("Lỗi khi đọc file PDF hoặc file bị lỗi bảo mật/định dạng: " + (err.message || err)));
      }
    };

    reader.onerror = (err) => {
      reject(new Error("Không thể đọc tệp PDF. Có lỗi FileReader: " + err));
    };

    reader.readAsArrayBuffer(file);
  });
}

// ─── SPC / CPK UTILITIES ───────────────────────────────────────────────────

export interface SubgroupPoint {
  runId: string;
  runName: string;
  date: string;
  lotNo: string;
  values: number[];
  mean: number;
  range: number;
}

export interface SPCStats {
  n: number;
  subgroups: number;
  mean: number;
  sigma: number;
  min: number;
  max: number;
  xBarMean: number;
  uclXBar: number;
  lclXBar: number;
  rBar: number;
  uclR: number;
  cp: number;
  cpu: number;
  cpl: number;
  cpk: number;
  usl: number;
  lsl: number;
}

/** Gom tất cả giá trị đo số từ các lượt đo cho 1 mốc đo */
export function collectSubgroups(runs: InspectionRun[], itemId: number): SubgroupPoint[] {
  const points: SubgroupPoint[] = [];
  for (const run of runs) {
    const result = run.results[itemId];
    if (!result) continue;
    const rawValues = [result.sample1, result.sample2, result.sample3, result.sample4]
      .map(v => (v !== undefined && v !== null && v.trim() !== '') ? parseFloat(v) : NaN)
      .filter(v => !isNaN(v));
    if (rawValues.length === 0) continue;
    const subMean = rawValues.reduce((a, b) => a + b, 0) / rawValues.length;
    const subRange = rawValues.length > 1 ? Math.max(...rawValues) - Math.min(...rawValues) : 0;
    points.push({
      runId: run.id,
      runName: run.runName,
      date: run.checkDate,
      lotNo: run.lotNo,
      values: rawValues,
      mean: parseFloat(subMean.toFixed(5)),
      range: parseFloat(subRange.toFixed(5)),
    });
  }
  return points;
}

const SPC_CONSTANTS: Record<number, { A2: number; D4: number }> = {
  1: { A2: 2.660, D4: 3.267 },
  2: { A2: 1.880, D4: 3.267 },
  3: { A2: 1.023, D4: 2.574 },
  4: { A2: 0.729, D4: 2.282 },
  5: { A2: 0.577, D4: 2.114 },
};

/** Tính toán đầy đủ CPK, CP, UCL, LCL từ danh sách subgroup */
export function calcSPCStats(subgroups: SubgroupPoint[], usl: number, lsl: number): SPCStats | null {
  if (subgroups.length === 0) return null;
  const allValues = subgroups.flatMap(s => s.values);
  const n = allValues.length;
  if (n === 0) return null;
  const mean = allValues.reduce((a, b) => a + b, 0) / n;
  const sigma = Math.sqrt(allValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const xBarMean = subgroups.reduce((a, s) => a + s.mean, 0) / subgroups.length;
  const rBar = subgroups.reduce((a, s) => a + s.range, 0) / subgroups.length;
  const avgN = Math.min(5, Math.max(1, Math.round(subgroups.reduce((a, s) => a + s.values.length, 0) / subgroups.length)));
  const c = SPC_CONSTANTS[avgN] || SPC_CONSTANTS[4];
  const uclXBar = xBarMean + c.A2 * rBar;
  const lclXBar = xBarMean - c.A2 * rBar;
  const uclR = c.D4 * rBar;
  const tolerance = usl - lsl;
  const cp = sigma > 0 ? tolerance / (6 * sigma) : 0;
  const cpu = sigma > 0 ? (usl - mean) / (3 * sigma) : 0;
  const cpl = sigma > 0 ? (mean - lsl) / (3 * sigma) : 0;
  const cpk = Math.min(cpu, cpl);
  return {
    n, subgroups: subgroups.length,
    mean: parseFloat(mean.toFixed(5)),
    sigma: parseFloat(sigma.toFixed(5)),
    min: parseFloat(minVal.toFixed(5)),
    max: parseFloat(maxVal.toFixed(5)),
    xBarMean: parseFloat(xBarMean.toFixed(5)),
    uclXBar: parseFloat(uclXBar.toFixed(5)),
    lclXBar: parseFloat(lclXBar.toFixed(5)),
    rBar: parseFloat(rBar.toFixed(5)),
    uclR: parseFloat(uclR.toFixed(5)),
    cp: parseFloat(cp.toFixed(3)),
    cpu: parseFloat(cpu.toFixed(3)),
    cpl: parseFloat(cpl.toFixed(3)),
    cpk: parseFloat(cpk.toFixed(3)),
    usl, lsl,
  };
}

export function cpkColor(cpk: number): string {
  if (cpk >= 1.67) return '#22c55e';
  if (cpk >= 1.33) return '#3b82f6';
  if (cpk >= 1.00) return '#f59e0b';
  return '#ef4444';
}

export function cpkLabel(cpk: number): string {
  if (cpk >= 1.67) return 'XUẤT SẮC';
  if (cpk >= 1.33) return 'ĐẠT';
  if (cpk >= 1.00) return 'CẬN BIÊN';
  return 'KHÔNG ĐẠT';
}
