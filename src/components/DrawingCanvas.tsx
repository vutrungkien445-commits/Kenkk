import React, { useRef } from 'react';
import { DrawingProgram, QCItem } from '../types';

interface DrawingCanvasProps {
  program: DrawingProgram;
  selectedItemId: number | null;
  mode: 'inspect' | 'edit';
  editorZoom: number;
  editorPan: { x: number; y: number };
  onSelectItem: (id: number) => void;
  onUpdateItemCoords: (id: number, coords: Partial<QCItem>) => void;
  onStartPan: (e: React.MouseEvent<HTMLDivElement>) => void;
  onUpdatePanZoom?: (zoom: number, pan: { x: number; y: number }) => void;
  editingQCItem?: QCItem | null;
  focusTrigger?: number;
}

export default function DrawingCanvas({
  program,
  selectedItemId,
  mode,
  editorZoom,
  editorPan,
  onSelectItem,
  onUpdateItemCoords,
  onStartPan,
  onUpdatePanZoom,
  editingQCItem,
  focusTrigger
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: 'move' | 'resize';
    itemId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  const [isSpotlightMaskEnabled, setIsSpotlightMaskEnabled] = React.useState(true);
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const lastCenteredItemIdRef = useRef<number | null>(null);
  const lastCenteredEditIdRef = useRef<number | null>(null);
  const lastFocusTriggerRef = useRef<number>(0);

  // Quan sát sự thay đổi kích thước của Container bằng ResizeObserver để lấy kích thước chính xác bất cứ lúc nào
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Đổi cách tính activeItem linh hoạt giữa Inspect (item đang chọn) và Edit (mốc đang được thiết lập)
  const activeItem = (mode === 'edit' && editingQCItem) 
    ? editingQCItem 
    : (program.qcItems.find(item => item.id === selectedItemId) || null);

  // Tính các mốc dải đo kiểm an toàn cho clip-path rộng hơn để không bị che khuất đường viền nhấp nháy (Spotlight Padding)
  const paddingFactor = 1.6;
  const halfWPadded = (activeItem ? (activeItem.w * paddingFactor) : 0) / 2;
  const halfHPadded = (activeItem ? (activeItem.h * paddingFactor) : 0) / 2;

  const L_safe = activeItem ? parseFloat(Math.max(0, Math.min(100, activeItem.x - halfWPadded)).toFixed(2)) : 0;
  const R_safe = activeItem ? parseFloat(Math.max(0, Math.min(100, activeItem.x + halfWPadded)).toFixed(2)) : 0;
  const T_safe = activeItem ? parseFloat(Math.max(0, Math.min(100, activeItem.y - halfHPadded)).toFixed(2)) : 0;
  const B_safe = activeItem ? parseFloat(Math.max(0, Math.min(100, activeItem.y + halfHPadded)).toFixed(2)) : 0;

  // Tự động căn giữa và phóng to mốc đo khi chọn ở chế độ Inspect hoặc Edit (Spotlight Focus)
  React.useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0 || !onUpdatePanZoom) return;

    const clickedSameItem = lastCenteredItemIdRef.current === selectedItemId;
    const triggerChanged = focusTrigger !== undefined && focusTrigger !== lastFocusTriggerRef.current;

    if (focusTrigger !== undefined) {
      lastFocusTriggerRef.current = focusTrigger;
    }

    if (mode === 'inspect' && selectedItemId !== null && selectedItemId > 0) {
      if (clickedSameItem && !triggerChanged) {
        // Đã căn giữa mốc này rồi, không chạy lại để giữ nguyên zoom/pan thủ công của người dùng
        return;
      }

      const item = program.qcItems.find(i => i.id === selectedItemId);
      if (item) {
        const w = dimensions.width;
        const h = dimensions.height;

        // Mức zoom theo cấu hình của mốc (mặc định 2.0 nếu trống)
        const targetZoom = item.scale || 2.0;

        // Tính toán vị trí dịch chuyển chính xác (đã nhân tỉ lệ phóng targetZoom) để căn giữa mốc đo hoàn hảo (0.5)
        const targetPanX = Math.round(w * (0.5 - item.x / 100) * targetZoom);
        const targetPanY = Math.round(h * (0.5 - item.y / 100) * targetZoom);

        lastCenteredItemIdRef.current = selectedItemId;
        onUpdatePanZoom(targetZoom, { x: targetPanX, y: targetPanY });
      }
    } else if (mode === 'edit' && editingQCItem) {
      // Khi đang chỉnh sửa mốc (hoặc bấm Thêm mốc mới), tự động phóng to và căn mốc đó lệch trái 
      // để nhường không gian bên phải cho Modal nổi thông số, tránh bị che khuất!
      const currentEditId = editingQCItem.id;
      // Dùng tổng tọa độ làm key khóa tạm thời cho mốc mới id = 0, ngăn giật hình khi kéo thả
      const editKey = currentEditId === 0 ? Math.round(editingQCItem.x + editingQCItem.y) : currentEditId;

      if (lastCenteredEditIdRef.current === editKey && !triggerChanged) {
        return;
      }

      const w = dimensions.width;
      const h = dimensions.height;

      const targetZoom = editingQCItem.scale || 2.2;

      // Căn lệch trái (0.33) thay vì căn chính giữa (0.5) để mốc đo tránh xa Modal overlay góc phải!
      // Áp dụng công thức chính xác khi dịch chuyển trong dải không gian đã phóng to (scale):
      const targetPanX = Math.round(w * (0.5 - editingQCItem.x / 100) * targetZoom - 0.17 * w);
      const targetPanY = Math.round(h * (0.5 - editingQCItem.y / 100) * targetZoom);

      lastCenteredEditIdRef.current = editKey;
      onUpdatePanZoom(targetZoom, { x: targetPanX, y: targetPanY });
    } else {
      lastCenteredItemIdRef.current = selectedItemId;
      lastCenteredEditIdRef.current = null;
    }
  }, [selectedItemId, mode, program.qcItems, onUpdatePanZoom, editingQCItem, dimensions, focusTrigger]);

  // Đăng ký sự kiện cuộn chuột (WheelZoom) hướng vào tâm con trỏ chuột
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      if (!onUpdatePanZoom) return;

      // Cường độ thu phóng
      const zoomFactor = 0.08;
      const delta = e.deltaY < 0 ? 1 : -1;
      const newZoom = parseFloat(Math.max(0.4, Math.min(10.0, editorZoom + delta * zoomFactor)).toFixed(2));

      if (newZoom === editorZoom) return;

      // Tọa độ chuột trong container
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Tọa độ chuột so với vị trí trung tâm hiện tại
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Đổi ngược về hệ trục unscaled và unpanned của bản vẽ
      const relativeX = (mouseX - centerX - editorPan.x) / editorZoom;
      const relativeY = (mouseY - centerY - editorPan.y) / editorZoom;

      // Tính pan mới để vị trí chuột được giữ nguyên không trôi dạt
      const newPanX = Math.round(mouseX - centerX - relativeX * newZoom);
      const newPanY = Math.round(mouseY - centerY - relativeY * newZoom);

      // Đánh dấu mốc để không kích hoạt căn giữa tự động
      lastCenteredItemIdRef.current = selectedItemId;

      onUpdatePanZoom(newZoom, { x: newPanX, y: newPanY });
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, [editorZoom, editorPan, selectedItemId, onUpdatePanZoom]);

  // Xử lý kéo thả định vị mốc đo trên bản vẽ
  const handleItemMouseDown = (e: React.MouseEvent, item: QCItem, type: 'move' | 'resize') => {
    e.stopPropagation();
    if (mode !== 'edit') {
      onSelectItem(item.id);
      return;
    }

    dragRef.current = {
      type,
      itemId: item.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: item.x,
      initialY: item.y,
      initialW: item.w,
      initialH: item.h
    };

    const handleMouseMove = (mouseEvent: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const drag = dragRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;

      // Tính delta phần trăm
      const deltaX_pct = ((mouseEvent.clientX - drag.startX) / containerW) * 100;
      const deltaY_pct = ((mouseEvent.clientY - drag.startY) / containerH) * 100;

      if (drag.type === 'move') {
        const newX = parseFloat(Math.max(0, Math.min(100, drag.initialX + deltaX_pct)).toFixed(1));
        const newY = parseFloat(Math.max(0, Math.min(100, drag.initialY + deltaY_pct)).toFixed(1));
        onUpdateItemCoords(drag.itemId, { x: newX, y: newY });
      } else if (drag.type === 'resize') {
        // Giữ mốc ở góc trên trái, chỉ thay đổi kích thước bằng cách kéo góc dưới phải
        const anchorX = drag.initialX - drag.initialW / 2;
        const anchorY = drag.initialY - drag.initialH / 2;
        const currentBrX = (drag.initialX + drag.initialW / 2) + deltaX_pct;
        const currentBrY = (drag.initialY + drag.initialH / 2) + deltaY_pct;

        const newW = parseFloat(Math.max(1.5, Math.min(100, currentBrX - anchorX)).toFixed(1));
        const newH = parseFloat(Math.max(1.5, Math.min(100, currentBrY - anchorY)).toFixed(1));
        const newX = parseFloat(Math.max(0, Math.min(100, anchorX + newW / 2)).toFixed(1));
        const newY = parseFloat(Math.max(0, Math.min(100, anchorY + newH / 2)).toFixed(1));

        onUpdateItemCoords(drag.itemId, { x: newX, y: newY, w: newW, h: newH });
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={containerRef}
      onMouseDown={onStartPan}
      className={`relative w-full h-full bg-slate-950 overflow-hidden select-none flex items-center justify-center cursor-grab active:cursor-grabbing`}
    >
      
      {/* Container di chuyển và thu phóng */}
      <div 
        className="relative transition-transform duration-150 ease-out origin-center"
        style={{
          transform: `translate(${editorPan.x}px, ${editorPan.y}px) scale(${editorZoom})`,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Bản vẽ linh kiện */}
        <img 
          src={program.imageSrc} 
          alt="Bản vẽ linh kiện và vị trí đo" 
          className="max-w-full max-h-[92%] object-contain block select-none pointer-events-none"
        />

        {/* Các mốc đo lường được định vị mượt mà trên bản vẽ */}
        {program.qcItems.map((item) => {
          // Nếu mốc này đang được chỉnh sửa trong modal/panel, hãy lấy giá trị tọa độ đang hiệu chỉnh thời gian thực
          const displayItem = (editingQCItem && editingQCItem.id === item.id) ? editingQCItem : item;
          const isSelected = displayItem.id === selectedItemId;

          return (
            <div
              key={displayItem.id}
              onMouseDown={(e) => handleItemMouseDown(e, displayItem, 'move')}
              className={`absolute border rounded transition-all cursor-pointer ${
                isSelected 
                  ? 'border-rose-500 border-dashed bg-transparent ring-2 ring-rose-400/40 z-30 shadow-lg shadow-rose-950/20' 
                  : 'border-blue-500 bg-blue-500/5 hover:bg-blue-400/10 hover:border-blue-400 z-10'
              }`}
              style={{
                left: `${displayItem.x}%`,
                top: `${displayItem.y}%`,
                width: `${displayItem.w}%`,
                height: `${displayItem.h}%`,
                transform: 'translate(-50%, -50%)',
              }}
              title={`Mốc ${displayItem.id}: ${displayItem.name}`}
            >
              {/* STT mốc đo - góc trên bên trái nếu được chọn để tránh che khuất tâm bản vẽ */}
              <span className={`absolute pointer-events-none w-5 h-5 flex items-center justify-center rounded-full shadow transition-all ${
                isSelected 
                  ? '-top-3 -left-3 bg-rose-600 text-white font-extrabold text-[10px] scale-105 z-40' 
                  : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[8px]'
              }`}>
                {displayItem.id}
              </span>

              {/* Tag nhãn nhỏ lơ lửng phía trên mốc */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 p-0.5 px-1.5 rounded bg-slate-900 border border-slate-700 text-[8px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-40 max-w-[120px] truncate">
                {displayItem.id}. {displayItem.name}
              </div>

              {/* Chấm kéo góc dưới bên phải để resize (mở ở chế độ Edit Master) */}
              {mode === 'edit' && isSelected && (
                <div
                  onMouseDown={(e) => handleItemMouseDown(e, displayItem, 'resize')}
                  className="absolute bottom-[-3px] right-[-3px] w-2.5 h-2.5 bg-yellow-400 border border-black rounded-full cursor-se-resize z-40"
                  style={{ transform: 'translate(25%, 25%)' }}
                />
              )}
            </div>
          );
        })}

        {/* NẾU LÀ MỐC ĐO CHƯA LƯU (ID === 0), HIỂN THỊ MỐC ĐO TỰ CHỌN ĐỂ KÉO THẢ TRÊN CANVAS */}
        {mode === 'edit' && editingQCItem && editingQCItem.id === 0 && (
          <div
            onMouseDown={(e) => handleItemMouseDown(e, editingQCItem, 'move')}
            className="absolute border border-dashed border-yellow-400 bg-transparent ring-2 ring-yellow-400/40 z-30 shadow-lg shadow-yellow-950/10 rounded group cursor-pointer"
            style={{
              left: `${editingQCItem.x}%`,
              top: `${editingQCItem.y}%`,
              width: `${editingQCItem.w}%`,
              height: `${editingQCItem.h}%`,
              transform: 'translate(-50%, -50%)',
            }}
            title="Mốc đo mới (Hãy kéo thả định vị trước khi bấm Lưu)"
          >
            {/* Tag nhãn chỉ thị "MỚI" - dịch lên góc trên trái */}
            <span className="absolute -top-3 -left-3 text-[10px] font-black pointer-events-none w-5 h-5 flex items-center justify-center rounded-full shadow bg-yellow-500 text-black z-40">
              ★
            </span>

            {/* Custom Tag name floating above */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-1 px-2 rounded bg-amber-950 border border-amber-500 text-[8px] font-bold text-amber-200 pointer-events-none whitespace-nowrap z-40 shadow-xl">
              📍 MỐC MỚI (KÉO THẢ & CO GIÃN)
            </div>

            {/* Chấm kéo góc dưới bên phải để resize */}
            <div
              onMouseDown={(e) => handleItemMouseDown(e, editingQCItem, 'resize')}
              className="absolute bottom-[-3px] right-[-3px] w-2.5 h-2.5 bg-yellow-400 border border-black rounded-full cursor-se-resize z-40"
              style={{ transform: 'translate(25%, 25%)' }}
            />
          </div>
        )}

        {/* Lớp phủ dìm xung quanh tăng tương phản Spotlight cực mạnh */}
        {((mode === 'inspect' && activeItem && isSpotlightMaskEnabled) || (mode === 'edit' && editingQCItem)) && activeItem && (
          <div 
            className="absolute inset-0 bg-black/70 pointer-events-none z-20 transition-all duration-300 backdrop-blur-[0.5px]"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, 
                ${L_safe}% 100%, 
                ${L_safe}% ${T_safe}%, 
                ${R_safe}% ${T_safe}%, 
                ${R_safe}% ${B_safe}%, 
                ${L_safe}% ${B_safe}%, 
                ${L_safe}% 100%, 
                100% 100%, 100% 0%
              )`
            }}
          />
        )}

        {/* Khung vẽ Spotlight tập trung tầm nhìn vào mốc đang chọn ở chế độ Inspect hoặc Edit */}
        {((mode === 'inspect' && activeItem) || (mode === 'edit' && editingQCItem)) && activeItem && (
          <div 
            className={`absolute border border-dashed pointer-events-none animate-pulse z-20 rounded ${
              mode === 'edit' 
                ? 'border-yellow-400/80 ring-4 ring-yellow-500/15'
                : 'border-rose-400/80 ring-4 ring-rose-500/15'
            }`}
            style={{
              left: `${activeItem.x}%`,
              top: `${activeItem.y}%`,
              width: `${activeItem.w * paddingFactor}%`,
              height: `${activeItem.h * paddingFactor}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}

      </div>

      {/* Control overlay cứu trợ zoom pan */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1 px-2 text-[10px] text-slate-400 z-40 no-print shadow-xl">
        <span className="font-mono">Zoom: {Math.round(editorZoom * 100)}%</span>
        <span className="text-slate-700">|</span>
        
        {mode === 'inspect' && activeItem && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsSpotlightMaskEnabled(prev => !prev); }}
              className={`transition-all rounded p-1.5 font-bold cursor-pointer ${
                isSpotlightMaskEnabled 
                  ? 'bg-rose-950 text-rose-400 border border-rose-900/60 hover:bg-rose-900/50' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
              title="Bật/Tắt lớp dìm tương phản môi trường xung quanh"
            >
              {isSpotlightMaskEnabled ? '💡 Xem toàn bộ' : '🎯 Bật tương phản'}
            </button>
            <span className="text-slate-700">|</span>
          </>
        )}

        <button 
          onClick={(e) => { e.stopPropagation(); onSelectItem(-1); }}
          className="hover:text-white transition-all bg-slate-800 hover:bg-slate-700 rounded p-1 cursor-pointer"
          title="Reset Pan/Zoom"
        >
          Đặt lại bản vẽ
        </button>
      </div>

    </div>
  );
}
