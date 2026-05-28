export interface RevisionHistory {
  rev: string;
  date: string;
  content: string;
  approver: string;
  creator: string;
}

export interface QCItem {
  id: number;
  name: string;
  standard: string;
  
  // Thông số dung sai
  isNumerical: boolean; // Có phải là kích thước đo số lượng không? (Nếu không, ví dụ Ngoại quan, Mã linh kiện)
  nominal?: number;      // Giá trị danh nghĩa (ví dụ: 45, 8, 10...)
  toleranceMin?: number; // Dung sai dưới (ví dụ: -5, -0.3...)
  toleranceMax?: number; // Dung sai trên (ví dụ: +5, +0.3...)
  minLimit?: number;     // Giới hạn dưới (Min)
  maxLimit?: number;     // Giới hạn trên (Max)
  warningOffsetMin?: number; // Dải Cận dưới (Ví dụ từ Min đến Min + cảnh báo này)
  warningOffsetMax?: number; // Dải Cận trên (Ví dụ từ Max - cảnh báo này đến Max)
  
  // Thông tin phụ
  tool: string;         // Dụng cụ kiểm tra (ví dụ: Bằng mắt, Thước mét, Thước cặp...)
  frequency: string;    // Tần suất xác nhận (ví dụ: n = 4cav/lot, n = 3/lot, Từng lot...)
  
  // Điểm quan trọng (ký hiệu tam giác chữ S màu đỏ)
  isCritical?: boolean;
  
  // Tọa độ Spotlight trên bản vẽ (%)
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}

export interface QCItemResult {
  sample1?: string; // Giá trị đo mẫu 1 / Cavity 1
  sample2?: string; // Giá trị đo mẫu 2 / Cavity 2
  sample3?: string; // Giá trị đo mẫu 3 / Cavity 3
  sample4?: string; // Giá trị đo mẫu 4 / Cavity 4
  note?: string;    // Ghi chú thêm
  manualStatus?: 'OK' | 'NG' | 'Cận Min' | 'Cận Max' | ''; // Trạng thái chọn tay nếu không là numerical
}

export interface InspectionRun {
  id: string;            // ID duy nhất của lần đo này
  runName: string;       // Tên lượt đo (ví dụ: Lượt đo lô #1, Lượt đo ngày 28/05/2026)
  checkDate: string;     // Ngày kiểm tra (người dùng nhập mỗi lần đo)
  inspector: string;     // Người kiểm tra (người dùng nhập)
  creator: string;       // Người lập (người dùng nhập)
  approver: string;      // Người duyệt (người dùng nhập)
  verifier: string;      // Người xác nhận (người dùng nhập)
  importQty: string;     // Tổng số lượng nhập (người dùng nhập)
  lotNo: string;         // Số lô (người dùng nhập)
  results: Record<number, QCItemResult>; // Kết quả đo chi tiết cho lượt đo này
  statusEvaluation: 'OK' | 'NG' | 'PENDING'; // Kết quả đánh giá lượt đo
}

export interface DrawingProgram {
  id: string;            // ID duy nhất của chương trình đo
  programName: string;   // Tên chương trình đo (vd: Connector housing, V-Tube...)
  drawingName: string;   // Tên bản vẽ gốc
  imageSrc: string;      // Chuỗi base64 hoặc URL ảnh sơ đồ sản phẩm
  partCode: string;      // Mã linh kiện (vd: Q3VN-008B)
  partName: string;      // Tên linh kiện (vd: Connector housing straight type)
  qcItems: QCItem[];     // Danh sách các mốc đo Master
  revisions: RevisionHistory[]; // Lịch sử thay đổi bản vẽ
  runs: InspectionRun[]; // Danh sách các lần đo thực tế
  activeRunId?: string;  // ID lượt đo hiện tại đang hoạt động
}
