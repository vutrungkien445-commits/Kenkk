import React, { useState, useEffect, useRef } from 'react';
import { 
  Target, 
  Settings, 
  Eye, 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  ArrowLeft, 
  Edit3, 
  Copy, 
  Check, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  User, 
  Package, 
  Tag, 
  HelpCircle,
  EyeOff,
  Sun,
  Moon,
  BarChart2,
  ListChecks
} from 'lucide-react';
import { DrawingProgram, QCItem, QCItemResult, RevisionHistory, InspectionRun } from './types';
import { DEFAULT_PROGRAM } from './defaultData';
import { evalSample, evalSummary, generateId, convertPdfToImage } from './utils';
import DrawingCanvas from './components/DrawingCanvas';
import ReportView from './components/ReportView';
import SPCAnalysisView from './components/SPCAnalysisView';

export default function App() {
  // --- QUẢN LÝ DANH SÁCH CHƯƠNG TRÌNH ĐO ---
  const [programs, setPrograms] = useState<DrawingProgram[]>([]);
  const [currentProgId, setCurrentProgId] = useState<string>('');
  const [viewState, setViewState] = useState<'home' | 'workspace' | 'report' | 'spc'>('home');
  const [showRunManagerModal, setShowRunManagerModal] = useState<boolean>(false);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());

  // --- TRẠNG THÁI CHỦ ĐỀ (THEME LIGHT/DARK) ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('qc_theme') as 'dark' | 'light') || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('qc_theme', newTheme);
    showToast(`Đã chuyển sang giao diện ${newTheme === 'dark' ? 'Tối (Dark)' : 'Sáng (Light)'}`, 'info');
  };

  // --- ZOOM & PAN & CHẾ ĐỘ HOẠT ĐỘNG ---
  const [mode, setMode] = useState<'inspect' | 'edit'>('inspect');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [focusTrigger, setFocusTrigger] = useState<number>(0);
  const [editorZoom, setEditorZoom] = useState<number>(1);
  const [editorPan, setEditorPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [workspaceDrag, setWorkspaceDrag] = useState<{ startX: number; startY: number; initialPanX: number; initialPanY: number } | null>(null);

  // Helper chọn mốc đo và kích hoạt phóng to / căn giữa ngay cả khi mốc đó đã được chọn
  const selectItemAndFocus = (id: number | null) => {
    setSelectedItemId(id);
    if (id !== null) {
      setFocusTrigger(prev => prev + 1);
    }
  };

  // --- TRẠNG THÁI HIỂN THỊ TOAST ---
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  // --- POPUP ĐIỀU CHỈNH CHƯƠNG TRÌNH & REVISION ---
  const [showProgramModal, setShowProgramModal] = useState<boolean>(false);
  const [editingProgramField, setEditingProgramField] = useState({
    id: '',
    programName: '',
    partCode: '',
    partName: '',
    drawingName: '',
    imageSrc: ''
  });

  // --- CHỈNH SỬA MỐC QC ĐANG EDIT ---
  const [editingQCItem, setEditingQCItem] = useState<QCItem | null>(null);

  // --- PHÙ ĐIỀU CHỈNH CHIỀU RỘNG NHẬP LIỆU SIDEBAR ---
  const [sidebarWidth, setSidebarWidth] = useState<number>(360);
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);

  // --- KHỞI TẠO TẢI CHƯƠNG TRÌNH TỪ FILE data.json (ƯU TIÊN) HOẶC LOCALSTORAGE ---
  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Thử tải từ file data.json qua API server
        const res = await fetch('/api/data');
        if (res.ok) {
          const parsed = await res.json() as DrawingProgram[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPrograms(parsed);
            setCurrentProgId(parsed[0].id);
            // Đồng bộ sang localStorage để backup
            localStorage.setItem('qc_drawing_programs', JSON.stringify(parsed));
            return;
          }
        }
      } catch (_) {
        // API không khả dụng, dùng fallback
      }

      // 2. Fallback: Thử đọc từ localStorage
      const localData = localStorage.getItem('qc_drawing_programs');
      if (localData) {
        try {
          const parsed = JSON.parse(localData) as DrawingProgram[];
          if (parsed.length > 0) {
            setPrograms(parsed);
            setCurrentProgId(parsed[0].id);
            return;
          }
        } catch (_) {}
      }

      // 3. Fallback cuối: dùng dữ liệu mặc định
      loadDefaultData();
    };

    initData();
  }, []);

  const loadDefaultData = () => {
    const list = [DEFAULT_PROGRAM];
    setPrograms(list);
    setCurrentProgId(DEFAULT_PROGRAM.id);
    localStorage.setItem('qc_drawing_programs', JSON.stringify(list));
    showToast('Tải dữ liệu chương trình mặc định thành công!', 'success');
  };

  // Lưu dữ liệu: ghi vào file data.json qua API VÀ đồng thời backup localStorage
  const saveProgramsToLocal = (newPrograms: DrawingProgram[]) => {
    setPrograms(newPrograms);
    // Backup localStorage
    localStorage.setItem('qc_drawing_programs', JSON.stringify(newPrograms));
    // Ghi chính vào file data.json
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPrograms, null, 2),
    }).catch(() => {
      // Nếu API lỗi thì chỉ dùng localStorage backup, không báo lỗi
    });
  };

  // --- CHƯƠNG TRÌNH ĐO HIỆN TẠI ---
  const currentProg = programs.find(p => p.id === currentProgId) || (programs.length > 0 ? programs[0] : null);

  // --- LỰƠT ĐO HIỆN TẠI ---
  const currentRun = currentProg?.runs?.find(r => r.id === currentProg.activeRunId) || currentProg?.runs?.[0] || null;

  // --- MỐC QC ĐANG CHỌN ---
  const selectedItem = currentProg?.qcItems.find(item => item.id === selectedItemId) || null;

  // --- HIỂN THỊ THÔNG BÁO ---
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // --- CO GIÃN SÀN SIDEBAR ---
  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(650, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  // --- PAN BẢN VẼ ---
  const handleStartPan = (e: React.MouseEvent<HTMLDivElement>) => {
    // Chỉ kích hoạt pan khi bấm vào hình nền canvas chứ không phải click mốc đo
    if ((e.target as HTMLElement).closest('.absolute.border')) return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialPanX = editorPan.x;
    const initialPanY = editorPan.y;

    const handleMouseMove = (mouseEvent: MouseEvent) => {
      const dX = mouseEvent.clientX - startX;
      const dY = mouseEvent.clientY - startY;
      setEditorPan({
        x: initialPanX + dX,
        y: initialPanY + dY
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // --- THÊM CHƯƠNG TRÌNH MASTER MỚI ---
  const handleCreateNewProgram = () => {
    setEditingProgramField({
      id: '',
      programName: '',
      partCode: '',
      partName: '',
      drawingName: '',
      imageSrc: 'https://files.catbox.moe/6isidk.png'
    });
    setShowProgramModal(true);
  };

  // --- CHỈNH SỬA METADATA CHƯƠNG TRÌNH MASTER ---
  const handleEditProgramMeta = (prog: DrawingProgram) => {
    setEditingProgramField({
      id: prog.id,
      programName: prog.programName,
      partCode: prog.partCode,
      partName: prog.partName,
      drawingName: prog.drawingName,
      imageSrc: prog.imageSrc
    });
    setShowProgramModal(true);
  };

  const handleSaveProgramMetaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgramField.programName.trim()) {
      showToast('Vui lòng nhập tên chương trình!', 'error');
      return;
    }

    if (editingProgramField.id) {
      // Edit
      const updated = programs.map(p => {
        if (p.id === editingProgramField.id) {
          return {
            ...p,
            programName: editingProgramField.programName,
            partCode: editingProgramField.partCode,
            partName: editingProgramField.partName,
            drawingName: editingProgramField.drawingName,
            imageSrc: editingProgramField.imageSrc
          };
        }
        return p;
      });
      saveProgramsToLocal(updated);
      showToast('Đã lưu thông tin Master thành công!', 'success');
    } else {
      // Create New
      const newId = 'prog-' + Math.random().toString(36).substr(2, 9);
      const newProg: DrawingProgram = {
        id: newId,
        programName: editingProgramField.programName,
        drawingName: editingProgramField.drawingName || 'TIÊU CHUẨN KIỂM TRA MỚI',
        partCode: editingProgramField.partCode || 'NEW-CODE-99',
        partName: editingProgramField.partName || 'Linh Kiện Mới',
        imageSrc: editingProgramField.imageSrc,
        revisions: [
          { rev: '00', date: new Date().toISOString().split('T')[0], content: 'Lập mới chương trình', approver: 'QA-Manager', creator: 'Draft' }
        ],
        qcItems: [
          { id: 1, name: 'Ngoại quan', standard: 'Bề mặt láng mịn, phẳng đẹp', isNumerical: false, tool: 'Bằng mắt', frequency: 'n = 4cav/lot', x: 50, y: 50, w: 15, h: 10, scale: 2 }
        ],
        runs: [
          {
            id: 'run-init',
            runName: 'Lượt đo mặc định đầu tiên',
            checkDate: new Date().toISOString().split('T')[0],
            inspector: 'Hải QC',
            creator: 'Hải QC',
            approver: 'Long',
            verifier: 'Fukushima',
            importQty: '1000',
            lotNo: 'LÔ-A1',
            results: {
              1: { sample1: 'Đạt bề mặt bóng loáng', manualStatus: 'OK' }
            },
            statusEvaluation: 'OK'
          }
        ],
        activeRunId: 'run-init'
      };
      
      const nextProgs = [...programs, newProg];
      saveProgramsToLocal(nextProgs);
      setCurrentProgId(newId);
      showToast('Đã tạo chương trình đo Master mới!', 'success');
    }
    setShowProgramModal(false);
  };

  // --- XÓA CHƯƠNG TRÌNH MASTER ---
  const handleDeleteProgramMaster = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn cả chương trình đo Master này không?')) {
      const nextProgs = programs.filter(p => p.id !== id);
      saveProgramsToLocal(nextProgs);
      if (currentProgId === id && nextProgs.length > 0) {
        setCurrentProgId(nextProgs[0].id);
      }
      showToast('Cửa hàng đã xóa chương trình đo!', 'success');
    }
  };

  // --- TẢI HÌNH ẢNH / BẢN VẼ CHO MASTER ---
  const handleDrawingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Đang nhận bản vẽ PDF, tiến hành chuyển đổi thành ảnh...', 'info');
      try {
        const imgBase64 = await convertPdfToImage(file);
        setEditingProgramField(prev => ({ ...prev, imageSrc: imgBase64 }));
        showToast('Đã tải và trích xuất sơ đồ thành công từ bản vẽ PDF!', 'success');
      } catch (err: any) {
        console.error(err);
        showToast(err.message || 'Lỗi khi chuyển đổi file PDF sang hình ảnh', 'error');
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setEditingProgramField(prev => ({ ...prev, imageSrc: reader.result as string }));
          showToast('Đã tải lên tệp vẽ thành công!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- THAY ĐỔI TỌA ĐỘ MỐC THEO KÉO THẢ TRÊN CANVAS ---
  const handleUpdateItemCoords = (itemId: number, coords: Partial<QCItem>) => {
    if (!currentProg) return;

    if (editingQCItem && (itemId === editingQCItem.id || (editingQCItem.id === 0 && itemId === 0))) {
      setEditingQCItem(prev => prev ? ({ ...prev, ...coords }) : null);
    }

    const updatedQCItems = currentProg.qcItems.map(item => {
      if (item.id === itemId) {
        return { ...item, ...coords };
      }
      return item;
    });

    const updatedProgs = programs.map(p => {
      if (p.id === currentProg.id) {
        return { ...p, qcItems: updatedQCItems };
      }
      return p;
    });
    saveProgramsToLocal(updatedProgs);
  };

  // --- QUẢN LÝ LƯỢT ĐO (RUNS) CHO CHƯƠNG TRÌNH ĐO ---
  const handleAddNewRun = () => {
    if (!currentProg) return;
    const runId = generateId();
    const newRunName = `Lần đo lô #${(currentProg.runs?.length || 0) + 1} (${new Date().toLocaleDateString('vi-VN')})`;
    
    const newRun: InspectionRun = {
      id: runId,
      runName: newRunName,
      checkDate: new Date().toISOString().split('T')[0],
      inspector: currentRun?.inspector || 'Người kiểm',
      creator: currentRun?.creator || 'Người lập',
      approver: currentRun?.approver || 'Long',
      verifier: currentRun?.verifier || 'Fukushima',
      importQty: '',
      lotNo: '',
      results: {},
      statusEvaluation: 'PENDING'
    };

    const updatedProgList = programs.map(p => {
      if (p.id === currentProg.id) {
        return {
          ...p,
          runs: [...(p.runs || []), newRun],
          activeRunId: runId
        };
      }
      return p;
    });

    saveProgramsToLocal(updatedProgList);
    showToast('Đã khởi tạo lượt đo mới thành công!', 'success');
  };

  const handleDeleteRun = (runId: string) => {
    if (!currentProg) return;
    if ((currentProg.runs?.length || 0) <= 1) {
      showToast('Không thể xóa lượt đo duy nhất còn lại!', 'error');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa lượt kiểm này? Toàn bộ mẫu đo sẽ mất.')) {
      const remainingRuns = currentProg.runs.filter(r => r.id !== runId);
      const nextActiveId = remainingRuns[0]?.id || '';
      
      const updatedProgList = programs.map(p => {
        if (p.id === currentProg.id) {
          return {
            ...p,
            runs: remainingRuns,
            activeRunId: nextActiveId
          };
        }
        return p;
      });
      saveProgramsToLocal(updatedProgList);
      showToast('Đã xóa lượt kiểm!', 'info');
    }
  };

  // Xoá nhiều lượt đo đã chọn qua modal quản lý
  const handleDeleteSelectedRuns = () => {
    if (!currentProg) return;

    let toDeleteIds = new Set(selectedRunIds);

    // Nếu người dùng chọn tất cả → tự động bỏ chọn lượt đang dùng để giữ lại
    const remaining = currentProg.runs.filter(r => !toDeleteIds.has(r.id));
    if (remaining.length === 0) {
      // Giữ lại lượt đang dùng (hoặc lượt đầu tiên nếu không có activeRunId)
      const keepId = currentProg.activeRunId || currentProg.runs[0]?.id;
      if (!keepId) return;
      toDeleteIds = new Set([...toDeleteIds].filter(id => id !== keepId));
      showToast('Giữ lại 1 lượt đo đang dùng, đã xoá phần còn lại!', 'info');
    }

    if (toDeleteIds.size === 0) return;

    const finalRemaining = currentProg.runs.filter(r => !toDeleteIds.has(r.id));
    const nextActiveId = toDeleteIds.has(currentProg.activeRunId || '')
      ? finalRemaining[0].id
      : (currentProg.activeRunId || finalRemaining[0].id);

    const updatedProgList = programs.map(p => {
      if (p.id === currentProg.id) {
        return { ...p, runs: finalRemaining, activeRunId: nextActiveId };
      }
      return p;
    });
    saveProgramsToLocal(updatedProgList);
    setSelectedRunIds(new Set());
    setShowRunManagerModal(false);
    if (remaining.length > 0) {
      showToast(`Đã xoá ${toDeleteIds.size} lượt đo!`, 'success');
    }
  };

  const handleSelectRun = (runId: string) => {
    if (!currentProg) return;
    const updated = programs.map(p => {
      if (p.id === currentProg.id) {
        return { ...p, activeRunId: runId };
      }
      return p;
    });
    saveProgramsToLocal(updated);
    setSelectedItemId(null);
  };

  // Cập nhật trường thông tin của lượt đo
  const handleUpdateRunMetaField = (field: keyof InspectionRun, value: string) => {
    if (!currentProg || !currentRun) return;
    
    // Cập nhật lượt đo cụ thể
    const updatedRuns = currentProg.runs.map(r => {
      if (r.id === currentRun.id) {
        const nextRun = { ...r, [field]: value };
        // Tự động kéo đánh giá chung khi có thay đổi
        nextRun.statusEvaluation = autoEvaluateOverallStatus(nextRun.results, currentProg.qcItems);
        return nextRun;
      }
      return r;
    });

    const updatedProgs = programs.map(p => {
      if (p.id === currentProg.id) {
        return {
          ...p,
          runs: updatedRuns
        };
      }
      return p;
    });
    saveProgramsToLocal(updatedProgs);
  };

  // --- CẬP NHẬT KẾT QUẢ ĐO CỦA MỐC ĐO ---
  const handleResultSampleChange = (itemId: number, sampleIndex: 'sample1' | 'sample2' | 'sample3' | 'sample4', value: string) => {
    if (!currentProg || !currentRun) return;

    const currentResult: QCItemResult = currentRun.results[itemId] || {};
    const updatedResult: QCItemResult = {
      ...currentResult,
      [sampleIndex]: value
    };

    // Nếu không phải đo lường số, dán mặc định manualstatus khi gán text
    const mốc = currentProg.qcItems.find(m => m.id === itemId);
    if (mốc && !mốc.isNumerical) {
      const lowVal = value.toUpperCase().trim();
      if (lowVal === 'OK' || lowVal === 'PASS' || lowVal === 'ĐẠT') updatedResult.manualStatus = 'OK';
      else if (lowVal === 'NG' || lowVal === 'FAIL' || lowVal === 'LỖI') updatedResult.manualStatus = 'NG';
    }

    const updatedResults = {
      ...currentRun.results,
      [itemId]: updatedResult
    };

    const overallEval = autoEvaluateOverallStatus(updatedResults, currentProg.qcItems);

    const updatedRuns = currentProg.runs.map(r => {
      if (r.id === currentRun.id) {
        return {
          ...r,
          results: updatedResults,
          statusEvaluation: overallEval
        };
      }
      return r;
    });

    const updatedProgs = programs.map(p => {
      if (p.id === currentProg.id) {
        return {
          ...p,
          runs: updatedRuns
        };
      }
      return p;
    });

    saveProgramsToLocal(updatedProgs);
  };

  // Thay đổi manualStatus (chọn tay cho mốc chữ)
  const handleManualStatusChange = (itemId: number, status: 'OK' | 'NG' | 'Cận Min' | 'Cận Max' | '') => {
    if (!currentProg || !currentRun) return;

    const currentResult: QCItemResult = currentRun.results[itemId] || {};
    const updatedResult: QCItemResult = {
      ...currentResult,
      manualStatus: status
    };

    const updatedResults = {
      ...currentRun.results,
      [itemId]: updatedResult
    };

    const overallEval = autoEvaluateOverallStatus(updatedResults, currentProg.qcItems);

    const updatedRuns = currentProg.runs.map(r => {
      if (r.id === currentRun.id) {
        return {
          ...r,
          results: updatedResults,
          statusEvaluation: overallEval
        };
      }
      return r;
    });

    const updatedProgs = programs.map(p => {
      if (p.id === currentProg.id) {
        return { ...p, runs: updatedRuns };
      }
      return p;
    });

    saveProgramsToLocal(updatedProgs);
  };

  // Đánh giá trạng thái chung của lượt đo (OK/NG)
  const autoEvaluateOverallStatus = (results: Record<number, QCItemResult>, qcItems: QCItem[]): 'OK' | 'NG' | 'PENDING' => {
    let hasNG = false;
    let hasMeasured = false;

    for (const item of qcItems) {
      const res = results[item.id];
      if (res) {
        const itemStatus = evalSummary(res, item);
        if (itemStatus === 'NG') hasNG = true;
        if (itemStatus !== 'CHƯA ĐO') hasMeasured = true;
      }
    }

    if (hasNG) return 'NG';
    if (!hasMeasured) return 'PENDING';
    return 'OK';
  };

  // --- QUẢN LÝ THÊM MỚI SỬA ĐỔI MỐC BAN MASTER (EDIT MASTER MODE) ---
  const handleSaveQCItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQCItem || !currentProg) return;

    let updatedQCItems = [...currentProg.qcItems];
    const itemIdx = updatedQCItems.findIndex(i => i.id === editingQCItem.id);

    // Tính toán minLimit và maxLimit tự động cho mốc đo lường số
    const savedItem = { ...editingQCItem };
    if (savedItem.isNumerical && savedItem.nominal !== undefined) {
      savedItem.minLimit = parseFloat((savedItem.nominal + (savedItem.toleranceMin || 0)).toFixed(4));
      savedItem.maxLimit = parseFloat((savedItem.nominal + (savedItem.toleranceMax || 0)).toFixed(4));
    }

    if (itemIdx >= 0) {
      // Edit
      updatedQCItems[itemIdx] = savedItem;
    } else {
      // Create new
      const nextId = updatedQCItems.length > 0 ? Math.max(...updatedQCItems.map(i => i.id)) + 1 : 1;
      savedItem.id = nextId;
      updatedQCItems.push(savedItem);
    }

    const updatedProgs = programs.map(p => {
      if (p.id === currentProg.id) {
        return { ...p, qcItems: updatedQCItems };
      }
      return p;
    });

    saveProgramsToLocal(updatedProgs);
    setEditingQCItem(null);
    showToast('Đã lưu thông số mốc đo thành công!', 'success');
  };

  const handleDeleteQCItem = (itemId: number) => {
    if (!currentProg) return;
    const remainingItems = currentProg.qcItems.filter(i => i.id !== itemId);
    
    const updatedProgs = programs.map(p => {
      if (p.id === currentProg.id) {
        return { ...p, qcItems: remainingItems };
      }
      return p;
    });
    saveProgramsToLocal(updatedProgs);
    setSelectedItemId(null);
    showToast(`Đã xóa mốc đo số [${itemId}] thành công!`, 'info');
  };

  // Tăng mốc hoạt động
  const handleNextItem = () => {
    if (!currentProg) return;
    const items = currentProg.qcItems;
    const currentIdx = items.findIndex(i => i.id === selectedItemId);
    if (currentIdx < items.length - 1) {
      selectItemAndFocus(items[currentIdx + 1].id);
    } else {
      selectItemAndFocus(items[0].id);
    }
  };

  const handlePrevItem = () => {
    if (!currentProg) return;
    const items = currentProg.qcItems;
    const currentIdx = items.findIndex(i => i.id === selectedItemId);
    if (currentIdx > 0) {
      selectItemAndFocus(items[currentIdx - 1].id);
    } else {
      selectItemAndFocus(items[items.length - 1].id);
    }
  };

  // --- QUẢN LÝ LỊCH SỬ SỬA ĐỔI MASTER (REVISIONS) ---
  const handleAddRevision = () => {
    if (!currentProg) return;
    const newRev: RevisionHistory = {
      rev: String(currentProg.revisions.length),
      date: new Date().toISOString().split('T')[0],
      content: 'Chỉnh sửa tiêu chuẩn đo lường linh kiện',
      approver: 'Long',
      creator: 'Hải'
    };

    const updated = programs.map(p => {
      if (p.id === currentProg.id) {
        return {
          ...p,
          revisions: [newRev, ...p.revisions]
        };
      }
      return p;
    });
    saveProgramsToLocal(updated);
    showToast('Đã tạo lịch sửa đổi mới!', 'success');
  };

  const handleRemoveRevision = (index: number) => {
    if (!currentProg) return;
    const updatedRevs = currentProg.revisions.filter((_, idx) => idx !== index);
    const updated = programs.map(p => {
      if (p.id === currentProg.id) {
        return { ...p, revisions: updatedRevs };
      }
      return p;
    });
    saveProgramsToLocal(updated);
  };

  const handleUpdateRevision = (index: number, key: keyof RevisionHistory, val: string) => {
    if (!currentProg) return;
    const updatedRevs = currentProg.revisions.map((rev, idx) => {
      if (idx === index) {
        return { ...rev, [key]: val };
      }
      return rev;
    });

    const updated = programs.map(p => {
      if (p.id === currentProg.id) {
        return { ...p, revisions: updatedRevs };
      }
      return p;
    });
    saveProgramsToLocal(updated);
  };

  return (
    <div id="app-root" className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased theme-${theme} transition-colors duration-250`}>
      
      {/* HEADER NAVBAR (ẨN HOÀN TOÀN KHI IN) */}
      <header className="no-print h-14 bg-slate-900 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 z-50 shadow-lg sticky top-0 transition-all duration-250">
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none block">Kiểm tra đầu vào (INPUT GC)</span>
            <span className="text-sm font-black text-white leading-none tracking-wide flex items-center gap-1.5 mt-0.5">
              QUẢN LÝ BẢN VẼ ĐO &amp; CHƯƠNG TRÌNH BIỂU MẪU
            </span>
          </div>
        </div>

        {/* CÁC ĐIỀU CHỈNH CHUNG QUANH TRANG CHỦ */}
        <div className="flex items-center gap-2">
          {viewState !== 'home' && (
            <button 
              onClick={() => setViewState(viewState === 'workspace' ? 'home' : 'workspace')}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-xs font-bold transition-all text-slate-200 cursor-pointer flex items-center gap-1 border border-slate-700/50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{viewState === 'workspace' ? 'Kho Bản Vẽ Master' : 'Quay lại Workspace'}</span>
            </button>
          )}

          {currentProg && viewState === 'workspace' && (
            <>
              <button
                onClick={() => setViewState('spc')}
                className="px-4 py-1.5 bg-violet-700 hover:bg-violet-600 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow shadow-violet-900/30 cursor-pointer flex items-center gap-1.5"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>SPC / CPK</span>
              </button>
              <button
                onClick={() => setViewState('report')}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow shadow-blue-900/30 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Xem &amp; In Báo Cáo</span>
              </button>
            </>
          )}

          {/* THEME TOGGLE BUTTON */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng (Light Mode)' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/50 cursor-pointer transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline-block">Giao diện Sáng</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline-block">Giao diện Tối</span>
              </>
            )}
          </button>

          <button 
            onClick={loadDefaultData}
            title="Khôi phục chương trình mặc định gốc"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/50 cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* CHIP THÔNG BÁO TOAST NỔI */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 animate-bounce cursor-default">
          <div className={`p-3 px-5 rounded-2xl flex items-center gap-2 w-auto shadow-2xl text-xs font-bold border ${
            toast.type === 'success' ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200' :
            toast.type === 'error' ? 'bg-rose-950/95 border-rose-500 text-rose-200' :
            'bg-slate-900/95 border-slate-600 text-slate-100'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* NỘI DUNG CHÍNH (ĐIỀU HỢP VIEWSTATE) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* VIEW 1: TRANG CHỦ DANH SÁCH BẢN VẼ MASTER */}
        {viewState === 'home' && (
          <div className="flex-1 overflow-y-auto bg-slate-950/40 p-4 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl">
              
              {/* Tóm tắt */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-white font-sans tracking-tight">KHO CHƯƠNG TRÌNH VÀ BẢN VẼ MASTER</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Mỗi biểu bản đại diện cho 1 Mã hàng, 1 Sơ đồ bản vẽ gốc và cho phép lưu trữ hàng ngàn Lượt đo đạc của lô hàng.
                  </p>
                </div>
                <button
                  onClick={handleCreateNewProgram}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black text-white transition-all shadow-lg shadow-blue-900/35 flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>TẠO BẢN VẼ MASTER MỚI</span>
                </button>
              </div>

              {/* Lưới bản vẽ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {programs.map((prog) => {
                  const runsCount = prog.runs?.length || 0;
                  const pointsCount = prog.qcItems?.length || 0;
                  
                  return (
                    <div 
                      key={prog.id}
                      onClick={() => {
                        setCurrentProgId(prog.id);
                        setViewState('workspace');
                      }}
                      className={`group bg-slate-900/40 rounded-3xl border transition-all duration-300 p-5 flex flex-col cursor-pointer ${
                        currentProgId === prog.id 
                          ? 'border-blue-500/80 bg-slate-900/90 shadow-xl shadow-blue-950/25 ring-1 ring-blue-500/10' 
                          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 shadow'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <span className="px-2.5 py-1 text-[10px] font-mono font-black tracking-wider bg-slate-950 text-blue-400 border border-slate-800 rounded-lg">
                          {prog.partCode}
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProgramMeta(prog);
                            }}
                            title="Sửa thông tin Master"
                            className="p-1 px-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {programs.length > 1 && (
                            <button
                              onClick={(e) => handleDeleteProgramMaster(prog.id, e)}
                              title="Xóa chương trình này"
                              className="p-1 px-1.5 bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 hover:text-white rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-black text-white hover:text-blue-400 transition-all font-sans tracking-tight mb-2 truncate">
                        {prog.programName}
                      </h3>

                      <p className="text-[11px] text-slate-400 line-clamp-1 mb-4 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span>Bản vẽ: {prog.drawingName}</span>
                      </p>

                      {/* Khung ảnh thu nhỏ tiêu cự */}
                      <div className="bg-slate-950 rounded-2xl p-2 mb-4 h-32 flex items-center justify-center border border-slate-800/80 overflow-hidden relative">
                        <img 
                          src={prog.imageSrc} 
                          className="max-h-full object-contain filter brightness-90 group-hover:scale-105 transition-transform duration-500"
                          alt="Layout representation"
                        />
                        <div className="absolute top-2 right-2 px-2 py-0.5 text-[9px] bg-slate-900 rounded font-bold text-gray-500 border border-slate-800/60">
                          {pointsCount} mốc đo
                        </div>
                      </div>

                      {/* Thông số lượt đo */}
                      <div className="mt-auto pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Số lượt đo đã lưu:</span>
                        <span className="font-mono font-black text-blue-400 bg-blue-950/50 border border-blue-900/50 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          {runsCount} lượt đo
                        </span>
                      </div>
                    </div>
                  );
                })}

              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: KHÔNG GIAN ĐO LƯỜNG WORKSPACE */}
        {viewState === 'workspace' && currentProg && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* SIDEBAR BẢNG ĐO VÀ KIỂM SOÁT LỘ (CO GIÃN ĐƯỢC) */}
            <div 
              style={{ width: `${sidebarWidth}px` }}
              className="bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 relative overflow-hidden z-20"
            >
              
              {/* PHẦN CHỌN LƯỢT ĐO VÀ THÔNG TIN ĐO KIỂM (ẨN KHI Ở CHẾ ĐỘ THIẾT LẬP BẢN VẼ) */}
              {mode === 'inspect' && (
                <>
                  {/* PHẦN CHỌN LƯỢT ĐO (RUNS) */}
                  <div className="p-3 border-b border-slate-800 bg-slate-950/45 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Lượt đo kiểm</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setSelectedRunIds(new Set()); setShowRunManagerModal(true); }}
                          title="Quản lý & Xoá nhiều lượt đo"
                          className="px-2 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg text-[10px] font-black tracking-wide border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <ListChecks className="w-3 h-3" />
                          <span>Quản lý</span>
                        </button>
                        <button
                          onClick={handleAddNewRun}
                          className="px-2 py-1 bg-blue-950 text-blue-400 hover:bg-blue-900 hover:text-white rounded-lg text-[10px] font-black tracking-wide border border-blue-900/80 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Đo lượt mới</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={currentProg.activeRunId || ''}
                        onChange={(e) => handleSelectRun(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {currentProg.runs?.map(run => (
                          <option key={run.id} value={run.id}>
                            {run.runName} ({run.lotNo})
                          </option>
                        ))}
                      </select>

                      {currentProg.runs && currentProg.runs.length > 1 && (
                        <button
                          onClick={() => currentProg.activeRunId && handleDeleteRun(currentProg.activeRunId)}
                          title="Xóa lượt đo này"
                          className="p-1 px-2 text-rose-400 bg-rose-950/20 hover:bg-rose-950/80 border border-rose-900/60 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* VÙNG NHẬP LIỆU THÔNG TIN LƯỢT ĐO VÀ KIỆM TRA (METADATA) */}
                  {currentRun ? (
                    <div className="bg-slate-950/20 border-b border-slate-800 px-3 p-2.5 grid grid-cols-2 gap-2 text-[11px]">
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-bold uppercase text-[9px] flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>Số lô / LOT NO</span>
                        </label>
                        <input 
                          type="text"
                          placeholder="vd: LOT-2026A"
                          value={currentRun.lotNo}
                          onChange={(e) => handleUpdateRunMetaField('lotNo', e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 px-2 font-mono text-xs text-white font-bold tracking-wide focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-slate-500 font-bold uppercase text-[9px] flex items-center gap-1">
                          <Package className="w-3 h-3 text-slate-500" />
                          <span>Số lượng nhập</span>
                        </label>
                        <input 
                          type="text"
                          placeholder="vd: 14000"
                          value={currentRun.importQty}
                          onChange={(e) => handleUpdateRunMetaField('importQty', e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 px-2 font-mono text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1 col-span-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-semibold text-[8px]">NGƯỜI K.TRA</label>
                            <input 
                              type="text"
                              value={currentRun.inspector}
                              onChange={(e) => handleUpdateRunMetaField('inspector', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px] text-white font-bold focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-500 font-semibold text-[8px]">NGÀY KIỂM</label>
                            <input 
                              type="date"
                              value={currentRun.checkDate}
                              onChange={(e) => handleUpdateRunMetaField('checkDate', e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg p-1 text-[10px] text-white font-bold focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-rose-300 font-black">Chưa khởi tạo lượt đo nào!</div>
                  )}
                </>
              )}

              {/* CHẾ ĐỘ INSPECT: NHẬP LIỆU DUNG SAI MỐC ĐO CHUYÊN NGHIỆP */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                
                {mode === 'inspect' && selectedItem && currentRun && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-4 relative animate-fade-in shadow-xl">
                    
                    {/* Header mốc */}
                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono font-black">MỐC ĐO SỐ {selectedItem.id}</span>
                        <h4 className="text-sm font-black text-white leading-snug font-sans tracking-tight line-clamp-1">
                          {selectedItem.name}
                        </h4>
                      </div>
                      {selectedItem.isCritical && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-rose-400 bg-rose-950/40 border border-rose-900/60 p-1 px-2 rounded-lg leading-none uppercase">
                          <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12,2 22,20 2,20" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                            <text x="12" y="17.5" fontSize="10" fontFamily="sans-serif" fontWeight="950" fill="currentColor" textAnchor="middle">S</text>
                          </svg>
                          <span>Critical</span>
                        </span>
                      )}
                    </div>

                    {/* Tiêu chuẩn */}
                    <div className="text-[11px] leading-relaxed bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl text-slate-300">
                      <span className="font-bold text-slate-400 block mb-0.5 uppercase text-[9px] tracking-wider">Tiêu chuẩn và Dung sai</span>
                      <p className="font-semibold text-slate-100">{selectedItem.standard}</p>
                      
                      {selectedItem.isNumerical && (
                        <div className="mt-2 text-[10px] font-semibold text-slate-400 flex items-center justify-between border-t border-slate-800/50 pt-2">
                          <span>Giới hạn dưới: <b className="font-mono text-white text-xs">{selectedItem.minLimit}</b></span>
                          <span>Giới hạn trên: <b className="font-mono text-white text-xs">{selectedItem.maxLimit}</b></span>
                        </div>
                      )}
                    </div>

                    {/* Khu vực đo lường mẫu (Hỗ trợ 4 Cavity/Mẫu) */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nhập Cavity đo (1 ➞ 4)</span>
                        <span className="text-[9px] text-slate-500 italic">Nhấn Enter để lưu &amp; sang mốc sau</span>
                      </div>

                      {selectedItem.isNumerical ? (
                        <div className="grid grid-cols-4 gap-2">
                          {['sample1', 'sample2', 'sample3', 'sample4'].map((sample, idx) => {
                            const val = currentRun.results[selectedItem.id]?.[sample as keyof QCItemResult] || '';
                            const sampleStatus = evalSample(val, selectedItem);
                            
                            return (
                              <div key={sample} className="flex flex-col gap-1">
                                <span className="text-center font-bold text-[9px] text-slate-500 font-mono">Cav #{idx+1}</span>
                                <input 
                                  type="text"
                                  placeholder="số đo"
                                  value={val}
                                  onChange={(e) => handleResultSampleChange(selectedItem.id, sample as any, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNextItem();
                                  }}
                                  className={`w-full bg-slate-900 border rounded-xl p-2 font-mono text-xs text-center font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    sampleStatus === 'OK' ? 'border-emerald-600/80 bg-emerald-950/20 text-emerald-200 shadow' :
                                    (sampleStatus === 'Cận Min' || sampleStatus === 'Cận Max') ? 'border-amber-500 bg-amber-500/10 text-amber-200' :
                                    sampleStatus === 'NG' ? 'border-rose-500 bg-rose-500/20 text-rose-200 animate-pulse font-extrabold' :
                                    'border-slate-800'
                                  }`}
                                />
                                {val && (
                                  <span className={`text-[8.5px] font-black text-center block mt-0.5 leading-none uppercase ${
                                    sampleStatus === 'OK' ? 'text-emerald-500' :
                                    (sampleStatus === 'Cận Min' || sampleStatus === 'Cận Max') ? 'text-amber-500' :
                                    'text-rose-500 font-black'
                                  }`}>
                                    {sampleStatus === 'Cận Min' ? 'Cận Min' : sampleStatus === 'Cận Max' ? 'Cận Max' : sampleStatus}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Mốc text phi số lượng (ví dụ mốc ngoại quan, text kiểm mẫu)
                        <div className="flex flex-col gap-2">
                          <textarea 
                            rows={3}
                            placeholder="Ghi nhận ngoại quan mẫu (Đạt, đẹp, sần rách, không rỉ sét...)"
                            value={currentRun.results[selectedItem.id]?.sample1 || ''}
                            onChange={(e) => handleResultSampleChange(selectedItem.id, 'sample1', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleNextItem();
                              }
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                          />
                          <div className="flex justify-between items-center gap-1 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400">Trạng thái thủ công:</span>
                            <div className="flex items-center gap-1.5">
                              {['OK', 'NG'].map(st => (
                                <button
                                  key={st}
                                  onClick={() => handleManualStatusChange(selectedItem.id, st as any)}
                                  className={`px-3 py-1 text-[10px] font-black tracking-wider rounded-lg transition-all cursor-pointer ${
                                    currentRun.results[selectedItem.id]?.manualStatus === st
                                      ? (st === 'OK' ? 'bg-emerald-600 text-white shadow shadow-emerald-950' : 'bg-rose-600 text-white shadow shadow-rose-950')
                                      : 'bg-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Phụ trợ note */}
                      <div className="flex flex-col gap-1 mt-2">
                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Ghi chú phụ</label>
                        <input
                          type="text"
                          placeholder="Bổ sung thông số hoặc vết bavia..."
                          value={currentRun.results[selectedItem.id]?.note || ''}
                          onChange={(e) => {
                            const res = currentRun.results[selectedItem.id] || {};
                            const updated = { ...currentRun.results, [selectedItem.id]: { ...res, note: e.target.value } };
                            
                            const updatedRuns = currentProg.runs.map(r => {
                              if (r.id === currentRun.id) {
                                return { ...r, results: updated };
                              }
                              return r;
                            });
                            const updatedProgs = programs.map(p => {
                              if (p.id === currentProg.id) {
                                return { ...p, runs: updatedRuns };
                              }
                              return p;
                            });
                            saveProgramsToLocal(updatedProgs);
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 px-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                        />
                      </div>

                    </div>

                    {/* Nút lật trang mốc */}
                    <div className="flex justify-between items-center gap-2 border-t border-slate-800 pt-3 text-xs">
                      <button 
                        onClick={handlePrevItem}
                        className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1 hover:text-white text-slate-300 transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Mốc trước</span>
                      </button>
                      <button 
                        onClick={handleNextItem}
                        className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1 hover:text-white text-slate-300 transition-all cursor-pointer"
                      >
                        <span>Mốc sau</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                )}

                {/* DANH SÁCH TỔNG HỢP 16 MỐC ĐO CHỮ/SỐ */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Danh sách mốc đo ({currentProg.qcItems.length})</span>
                    {mode === 'edit' && (
                      <button
                        onClick={() => {
                          setEditingQCItem({
                            id: 0,
                            name: 'Kích thước kiểm tra mới',
                            standard: '4.5 ± 0.1',
                            isNumerical: true,
                            nominal: 4.5,
                            toleranceMin: -0.1,
                            toleranceMax: 0.1,
                            minLimit: 4.4,
                            maxLimit: 4.6,
                            tool: 'Thước cặp',
                            frequency: 'n = 4cav/lot',
                            x: 50,
                            y: 50,
                            w: 12,
                            h: 8,
                            scale: 2.2
                          });
                        }}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[9px] font-black border border-slate-700 hover:text-white transition-all flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm mốc</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {currentProg.qcItems.map(item => {
                      const isSelected = item.id === selectedItemId;
                      const res = currentRun?.results?.[item.id];
                      const summaryStatus = evalSummary(res, item);

                      return (
                        <div
                          key={item.id}
                          onClick={() => selectItemAndFocus(item.id)}
                          className={`p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'border-rose-500 bg-rose-500/10 shadow-md ring-1 ring-rose-500/20' 
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700/80 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shadow ${
                              isSelected 
                                ? 'bg-rose-600 text-white' 
                                : 'bg-slate-800 text-slate-300 font-mono'
                            }`}>
                              {item.id}
                            </span>
                            
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-extrabold text-white font-sans">{item.name}</span>
                                {item.isCritical && (
                                  <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="12,2 22,20 2,20" fill="none" stroke="currentColor" strokeWidth="2"/>
                                    <text x="12" y="17" fontSize="10" fontFamily="sans-serif" fontWeight="950" fill="currentColor" textAnchor="middle">S</text>
                                  </svg>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 font-medium block mt-0.5 font-mono">{item.standard}</span>
                            </div>
                          </div>

                          {/* Trạng thái mốc */}
                          <div className="flex items-center gap-1.5 shrink-0 select-none">
                            {summaryStatus === 'OK' && (
                              <span className="text-[8.5px] font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/70 p-0.5 px-2 rounded-lg leading-none uppercase shadow-sm">OK</span>
                            )}
                            {(summaryStatus === 'Cận Min' || summaryStatus === 'Cận Max') && (
                              <span className="text-[8px] font-black text-amber-400 bg-amber-950/40 border border-amber-900/70 p-0.5 px-1.5 rounded-lg leading-none uppercase shadow-sm">Cận Biên</span>
                            )}
                            {summaryStatus === 'NG' && (
                              <span className="text-[8.5px] font-black text-rose-400 bg-rose-950/50 border border-rose-900/70 p-0.5 px-1.5 rounded-lg leading-none uppercase shadow-sm animate-pulse">NG</span>
                            )}
                            {summaryStatus === 'CHƯA ĐO' && (
                              <span className="text-[8.5px] font-extrabold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded-lg leading-none italic font-mono">-</span>
                            )}

                            {mode === 'edit' && (
                              <div className="flex items-center ml-2 border-l border-slate-800 pl-1.5 gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingQCItem(item);
                                  }}
                                  className="p-1 hover:text-white text-slate-400 cursor-pointer"
                                  title="Sửa mốc"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteQCItem(item.id);
                                  }}
                                  className="p-1 hover:text-red-400 text-slate-400 cursor-pointer"
                                  title="Xóa mốc"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>


              </div>

              {/* THANH RESIZER SIDEBAR */}
              <div 
                onMouseDown={() => setIsResizingSidebar(true)}
                className="absolute top-0 right-0 w-1 h-full bg-slate-800/80 hover:bg-blue-500 cursor-col-resize z-50 transition-all"
              />
            </div>

            {/* VÙNG CHÍNH HIỂN THỊ CANVAS BẢN VẼ + CHỌN CHẾ ĐỘ CHUẨN */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              
              {/* THANH ĐIỀU CHỈNH CHẾ ĐỘ TRÊN ĐẦU (INSPECT VS EDIT) */}
              <div className="h-12 bg-slate-900/60 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 no-print">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                  <button
                    onClick={() => { setMode('inspect'); setSelectedItemId(null); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      mode === 'inspect' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Đo đạc &amp; Đánh giá (Inspect)</span>
                  </button>
                  <button
                    onClick={() => { setMode('edit'); setSelectedItemId(null); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      mode === 'edit' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Thiết lập Bản Vẽ (Edit Master)</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Mã linh kiện Master: <b className="text-white font-mono font-extrabold">{currentProg.partCode}</b></span>
                  </span>
                  
                  {mode === 'edit' && (
                    <button
                      onClick={() => handleEditProgramMeta(currentProg)}
                      className="px-2.5 py-1 bg-blue-950 text-blue-400 hover:bg-blue-900 rounded-lg text-[10px] font-black border border-blue-900/55 transition-all text-center cursor-pointer"
                    >
                      Sửa thông tin linh kiện
                    </button>
                  )}
                </div>
              </div>

              {/* VÙNG CHỨA BẦU CHỨA CANVAS BẢN VẼ */}
              <div className="flex-1 relative overflow-hidden bg-slate-950">
                <DrawingCanvas 
                  program={currentProg}
                  selectedItemId={selectedItemId}
                  focusTrigger={focusTrigger}
                  mode={mode}
                  editorZoom={editorZoom}
                  editorPan={editorPan}
                  editingQCItem={editingQCItem}
                  onSelectItem={(id) => {
                    if (id === -1) {
                      setEditorZoom(1);
                      setEditorPan({ x: 0, y: 0 });
                    } else {
                      selectItemAndFocus(id);
                    }
                  }}
                  onUpdateItemCoords={handleUpdateItemCoords}
                  onStartPan={handleStartPan}
                  onUpdatePanZoom={(zoom, pan) => {
                    setEditorZoom(zoom);
                    setEditorPan(pan);
                  }}
                />
              </div>

            </div>

          </div>
        )}

        {/* VIEW 3: BIỂU MẪU IN BÁO CÁO REPORT VIEW (FORM VQC-002-01) */}
        {viewState === 'report' && currentProg && currentRun && (
          <ReportView 
            program={currentProg}
            run={currentRun}
            onBack={() => setViewState('workspace')}
          />
        )}

        {/* VIEW 4: PHÂN TÍCH SPC / CPK */}
        {viewState === 'spc' && currentProg && (
          <SPCAnalysisView
            program={currentProg}
            onBack={() => setViewState('workspace')}
          />
        )}

      </div>

      {/* MODAL QUẢN LÝ LƯỢT ĐO — XOÁ NHIỀU */}
      {showRunManagerModal && currentProg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in no-print">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[80vh]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-violet-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Quản lý Lượt Đo</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{currentProg.runs.length} lượt đo</span>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-3">
              <button
                onClick={() => {
                  if (selectedRunIds.size === currentProg.runs.length) {
                    setSelectedRunIds(new Set());
                  } else {
                    setSelectedRunIds(new Set(currentProg.runs.map(r => r.id)));
                  }
                }}
                className="flex items-center gap-1.5 hover:text-white transition-all cursor-pointer font-bold"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedRunIds.size === currentProg.runs.length ? 'bg-violet-600 border-violet-600' : 'border-slate-600'}`}>
                  {selectedRunIds.size === currentProg.runs.length && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                Chọn tất cả ({currentProg.runs.length})
              </button>
              {selectedRunIds.size > 0 && (
                <span className="text-violet-400 font-black">Đã chọn: {selectedRunIds.size}</span>
              )}
            </div>

            {/* Danh sách */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {currentProg.runs.map(run => {
                const isChecked = selectedRunIds.has(run.id);
                const isActive = run.id === currentProg.activeRunId;
                return (
                  <div
                    key={run.id}
                    onClick={() => {
                      const next = new Set(selectedRunIds);
                      if (next.has(run.id)) next.delete(run.id);
                      else next.add(run.id);
                      setSelectedRunIds(next);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${isChecked ? 'border-violet-500/70 bg-violet-950/30' : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${isChecked ? 'bg-violet-600 border-violet-600' : 'border-slate-600'}`}>
                      {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-white truncate">{run.runName}</span>
                        {isActive && <span className="text-[8px] font-black text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-1.5 py-0.5 rounded-full shrink-0">ĐANG DÙNG</span>}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{run.checkDate} · LOT: {run.lotNo || '—'} · {run.inspector}</span>
                    </div>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg shrink-0 ${run.statusEvaluation === 'OK' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/60' : run.statusEvaluation === 'NG' ? 'text-rose-400 bg-rose-950/40 border border-rose-900/60' : 'text-slate-500 bg-slate-950 border border-slate-800'}`}>
                      {run.statusEvaluation}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowRunManagerModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={selectedRunIds.size === 0}
                onClick={handleDeleteSelectedRuns}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${selectedRunIds.size > 0 ? 'bg-rose-700 hover:bg-rose-600 text-white cursor-pointer shadow shadow-rose-950/40' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xoá {selectedRunIds.size > 0 ? `${selectedRunIds.size} lượt đo đã chọn` : 'đã chọn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TẠO MỚI HOẶC CHỈNH SỬA THÔNG TIN LINH KIỆN MASTER */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in no-print">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-black text-white font-sans tracking-tight mb-4 uppercase">
              {editingProgramField.id ? 'CẬP NHẬT THÔNG TIN BẢN VẼ MASTER' : 'TẠO CHƯƠNG TRÌNH CHO LINH KIỆN MỚI'}
            </h3>

            <form onSubmit={handleSaveProgramMetaSubmit} className="flex flex-col gap-4 text-xs">
              
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold uppercase text-[10px]">Tên chương trình đo</label>
                <input 
                  type="text"
                  required
                  placeholder="ví dụ: Connector housing straight type (Body)"
                  value={editingProgramField.programName}
                  onChange={(e) => setEditingProgramField(prev => ({ ...prev, programName: e.target.value }))}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Mã linh kiện (Part Code)</label>
                  <input 
                    type="text"
                    required
                    placeholder="ví dụ: Q3VN-008B"
                    value={editingProgramField.partCode}
                    onChange={(e) => setEditingProgramField(prev => ({ ...prev, partCode: e.target.value }))}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-bold uppercase text-[10px]">Tên linh kiện (Part Name)</label>
                  <input 
                    type="text"
                    required
                    placeholder="Connector housing"
                    value={editingProgramField.partName}
                    onChange={(e) => setEditingProgramField(prev => ({ ...prev, partName: e.target.value }))}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold uppercase text-[10px]">Tên bản vẽ</label>
                <input 
                  type="text"
                  placeholder="TIÊU CHUẨN KIỂM TRA Q3VN-008B"
                  value={editingProgramField.drawingName}
                  onChange={(e) => setEditingProgramField(prev => ({ ...prev, drawingName: e.target.value }))}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              {/* Tải sơ đồ */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Hình ảnh sơ đồ bản vẽ</span>
                  <p className="text-[9.5px] text-slate-500 mt-1">Đăng tải ảnh sơ đồ sản phẩm (PNG, JPG, PDF) để làm ảnh nền đo lường.</p>
                </div>
                <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer border border-slate-700">
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  <span>Tải ảnh/PDF lên</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={handleDrawingUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {editingProgramField.imageSrc && (
                <div className="h-20 bg-slate-950 rounded-xl p-2 border border-slate-800/60 overflow-hidden flex items-center justify-center relative">
                  <img src={editingProgramField.imageSrc} className="max-h-full object-contain" alt="Selected drawing" />
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Đóng hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-900/35"
                >
                  Lưu thông tin Master
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM HOẶC CHỈNH SỬA THÔNG SỐ CHI TIẾT MỐC ĐO (KHO MASTER) */}
      {editingQCItem && (
        <div className="fixed top-24 right-4 z-50 w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl animate-fade-in no-print max-h-[80vh] overflow-y-auto">
          <h3 className="text-sm font-black text-white font-sans tracking-tight mb-3 uppercase flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-blue-400" />
            <span>{editingQCItem.id === 0 ? 'Thêm mốc đo Master mới' : `Hiệu chỉnh mốc đo Master số [${editingQCItem.id}]`}</span>
          </h3>

          <form onSubmit={handleSaveQCItem} className="flex flex-col gap-3 text-xs">
            
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold uppercase text-[9px]">Tên mốc đo kích thước</label>
              <input 
                type="text"
                required
                placeholder="ví dụ: Đường kính trong, Ngoại quan..."
                value={editingQCItem.name}
                onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-bold uppercase text-[9px]">Tiêu chuẩn kỹ thuật hiển thị</label>
              <input 
                type="text"
                required
                placeholder="ví dụ: Ø3.5 ± 0.05 hoặc Màu đen đồng nhất"
                value={editingQCItem.standard}
                onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, standard: e.target.value }) : null)}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-semibold"
              />
            </div>

            {/* Loại đo kiểm (chữ hay số) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <input 
                  type="checkbox"
                  id="isNumerical"
                  checked={editingQCItem.isNumerical}
                  onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, isNumerical: e.target.checked }) : null)}
                  className="accent-blue-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <label htmlFor="isNumerical" className="text-slate-300 font-bold cursor-pointer select-none text-[10px]">Mốc số (Numerical)?</label>
              </div>
              
              <div className="flex items-center gap-1.5">
                <input 
                  type="checkbox"
                  id="isCritical"
                  checked={!!editingQCItem.isCritical}
                  onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, isCritical: e.target.checked }) : null)}
                  className="accent-rose-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <label htmlFor="isCritical" className="text-slate-300 font-bold cursor-pointer select-none text-[10px] text-rose-400">Điểm Critical S?</label>
              </div>
            </div>

            {/* Hiển thị form ghi dung sai nếu là mốc đo số lượng */}
            {editingQCItem.isNumerical && (
              <>
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800/40">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-bold text-[8px] uppercase">Danh Nghĩa</span>
                    <input 
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 5"
                      value={editingQCItem.nominal ?? ''}
                      onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, nominal: parseFloat(e.target.value) }) : null)}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs font-bold text-white text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-bold text-[8px] uppercase">Dưới (-)</span>
                    <input 
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. -0.1"
                      value={editingQCItem.toleranceMin ?? ''}
                      onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, toleranceMin: parseFloat(e.target.value) }) : null)}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs font-bold text-white text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-bold text-[8px] uppercase">Trên (+)</span>
                    <input 
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 0.1"
                      value={editingQCItem.toleranceMax ?? ''}
                      onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, toleranceMax: parseFloat(e.target.value) }) : null)}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs font-bold text-white text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800/40">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-bold text-[8px] uppercase">Cận Dưới (MIN)</span>
                    <input 
                      type="number"
                      step="any"
                      placeholder="e.g. 0.02"
                      value={editingQCItem.warningOffsetMin ?? ''}
                      onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, warningOffsetMin: e.target.value === '' ? undefined : parseFloat(e.target.value) }) : null)}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs font-bold text-white text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-bold text-[8px] uppercase">Cận Trên (MAX)</span>
                    <input 
                      type="number"
                      step="any"
                      placeholder="e.g. 0.02"
                      value={editingQCItem.warningOffsetMax ?? ''}
                      onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, warningOffsetMax: e.target.value === '' ? undefined : parseFloat(e.target.value) }) : null)}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-1 font-mono text-xs font-bold text-white text-center"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold uppercase text-[9px]">Dụng cụ đo</label>
                <input 
                  type="text"
                  placeholder="ví dụ: Thước cặp..."
                  value={editingQCItem.tool}
                  onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, tool: e.target.value }) : null)}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold uppercase text-[9px]">Tần suất</label>
                <input 
                  type="text"
                  placeholder="ví dụ: n = 4cav/lot"
                  value={editingQCItem.frequency}
                  onChange={(e) => setEditingQCItem(prev => prev ? ({ ...prev, frequency: e.target.value }) : null)}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 text-white"
                />
              </div>
            </div>

            {/* Tọa độ spotlight */}
            <div className="bg-slate-950/40 border border-slate-850 p-2 rounded-xl text-[10px] text-slate-400">
              <span className="font-bold text-slate-300 block mb-0.5">Vị trí mốc</span>
              <p className="text-[9px] leading-snug mb-1.5 text-slate-500">Giữ kéo và kéo thả mốc vàng hình tròn lơ lửng trên bản vẽ để căn chỉnh tọa độ.</p>
              <div className="grid grid-cols-3 gap-1 text-center font-mono font-bold text-white">
                <div className="bg-slate-900/40 p-1 rounded">X: {editingQCItem.x}%</div>
                <div className="bg-slate-900/40 p-1 rounded">Y: {editingQCItem.y}%</div>
                <div className="bg-slate-900/40 p-1 rounded">W: {editingQCItem.w}%</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setEditingQCItem(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 cursor-pointer"
              >
                Đóng hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-md"
              >
                Lưu thông số
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
