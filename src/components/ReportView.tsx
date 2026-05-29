import React from 'react';
import { DrawingProgram, InspectionRun, QCItem } from '../types';
import { evalSample, evalSummary } from '../utils';

interface ReportViewProps {
  program: DrawingProgram;
  run: InspectionRun;
  onBack: () => void;
}

export default function ReportView({ program, run, onBack }: ReportViewProps) {
  // Trạng thái tổng hợp của lượt đo này
  const overallStatus = run.statusEvaluation;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 bg-slate-900 overflow-y-auto p-4 md:p-8 no-print flex flex-col items-center">
      
      {/* Thanh công cụ báo cáo */}
      <div className="w-full max-w-[210mm] bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 no-print shadow-xl">
        <div className="flex-1">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Xem thử bản in Báo Cáo Đo Lường</h2>
          <p className="text-[11px] text-slate-400">Thiết kế căn chỉnh 100% khớp biểu mẫu nhà máy <b>Form VQC - 002 - 01</b></p>
          <div className="text-[10px] text-blue-700 bg-blue-50/90 p-2 rounded-xl border border-blue-200 mt-1.5 font-medium leading-relaxed font-sans">
            💡 <b>Hướng dẫn lưu PDF:</b> Sau khi bấm nút <b>In Bản Đo / Xuất PDF</b>, tại hộp thoại in của trình duyệt, bạn chọn máy in (Destination) là <b>Lưu dưới dạng PDF (Save as PDF)</b> rồi bấm nút <b>Lưu (Save)</b> để tự chọn vị trí lưu và đặt tên file PDF theo ý muốn trên máy tính của bạn.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition-all text-slate-200 cursor-pointer"
          >
            Quay lại đo lường
          </button>
          <button 
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-blue-900/35 flex items-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>In Bản Đo / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* VÙNG IN BAO PHỦ BẢNG (KÍCH THƯỚC CHUẨN A4 DỌC: 210mm x 297mm) */}
      <div className="print-area bg-white text-black p-4 md:p-8 w-full max-w-[210mm] border border-slate-300 min-h-[297mm] shadow-2xl relative text-[11px]">
        
        {/* TIÊU ĐỀ BIỂU MẪU KHỚP HÌNH ẢNH */}
        <div className="grid grid-cols-12 border border-black mb-1">
          
          {/* Logo SRK-HV hình thoi màu xanh đậm chuẩn xác */}
          <div className="col-span-2 border-r border-black flex items-center justify-center p-1 bg-white">
            <svg className="w-[60px] h-[60px]" viewBox="0 0 120 120">
              {/* Hình thoi xanh đậm */}
              <polygon points="60,6 114,60 60,114 6,60" fill="#0c1b40" stroke="#000000" strokeWidth="1.5"/>
              {/* Dải xanh dương sáng đè lên */}
              <rect x="2" y="48" width="116" height="24" fill="#0079c1" stroke="#ffffff" strokeWidth="1.2" />
              {/* Dải trắng viền mảnh */}
              <line x1="2" y1="50" x2="118" y2="50" stroke="#ffffff" strokeWidth="0.8"/>
              <line x1="2" y1="70" x2="118" y2="70" stroke="#ffffff" strokeWidth="0.8"/>
              {/* Chữ SRK-HV */}
              <text x="60" y="65" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13.5" fill="#ffffff" letterSpacing="0.5" textAnchor="middle">SRK-HV</text>
            </svg>
          </div>

          {/* Tiêu đề chính */}
          <div className="col-span-7 border-r border-black flex flex-col items-center justify-center p-2 text-center">
            <h1 className="text-lg md:text-xl font-extrabold tracking-wide text-black font-sans uppercase">TIÊU CHUẨN KIỂM TRA (IN PUT)</h1>
          </div>

          {/* Cột quản lý ở Header bên phải */}
          <div className="col-span-3 flex flex-col text-[9px] bg-white relative pt-2">
            <span className="absolute top-0 right-1 text-[8px] font-bold text-black font-sans leading-none">Form VQC - 002 - 01</span>
            <div className="flex border border-black border-b-0 border-r-0 border-l-0 mt-1">
              <span className="w-full p-0.5 pl-1.5 font-bold text-left text-black">Ngày ban hành: 30/01/2018.</span>
            </div>
            <div className="flex border border-black border-r-0 border-l-0">
              <span className="w-[45%] p-0.5 pl-1.5 font-bold text-left text-black">Số quản lý:</span>
              <span className="w-[55%] p-0.5 font-mono font-bold text-right pr-2 text-black">VQC - 002 - 001</span>
            </div>
          </div>
        </div>

        {/* BẢNG THÔNG TIN LINH KIỆN & KIỂM TRA (KHỚP 100% 2 HÀNG x 7 CỘT) */}
        <table className="w-full border-collapse border border-black text-[9px] mt-1 table-fixed">
          <tbody>
            <tr>
              <td className="border border-black font-bold p-1 bg-gray-100 text-center w-[12%] leading-tight text-black">Mã linh kiện</td>
              <td className="border border-black font-mono font-black p-1 text-center w-[18%] leading-tight text-[10px] text-black">{program.partCode}</td>
              <td className="border border-black font-bold p-1 bg-gray-100 text-center w-[11%] leading-tight text-black">Đánh giá</td>
              <td className="border border-black font-bold p-1 bg-gray-100 text-center w-[11%] leading-tight text-black">Phê duyệt</td>
              <td className="border border-black font-bold p-1 bg-gray-100 text-center w-[11%] leading-tight text-black">Xác nhận</td>
              <td className="border border-black font-bold p-1 bg-gray-100 text-center w-[15%] leading-tight text-black">Người kiểm tra</td>
              <td className="border border-black font-bold p-1 bg-gray-100 text-center w-[22%] leading-tight text-black">Ngày kiểm tra</td>
            </tr>
            <tr className="h-7 text-center font-bold text-black text-[8.5px]">
              <td className="border border-black font-bold p-1 bg-gray-100 leading-tight text-black">Tên linh kiện</td>
              <td className="border border-black p-1 text-left font-bold text-[8.5px] leading-tight break-words uppercase text-black">{program.partName}</td>
              {/* Ô đánh giá: Đã đo xong và kết quả */}
              <td className="border border-black p-1 text-center flex items-center justify-center h-full min-h-[28px]">
                {overallStatus === 'OK' && <span className="text-green-700 bg-green-50 border border-green-300 px-1.5 py-0.2 rounded font-black text-[9px] tracking-wider leading-none">OK</span>}
                {overallStatus === 'NG' && <span className="text-red-700 bg-red-50 border border-red-300 px-1.5 py-0.2 rounded font-black text-[9px] tracking-wider leading-none">NG</span>}
                {overallStatus === 'PENDING' && <span className="text-amber-700 bg-amber-50 border border-amber-300 px-1 py-0.2 rounded font-black text-[8px] leading-none block">ĐANG ĐO</span>}
              </td>
              {/* Ô phê duyệt */}
              <td className="border border-black p-1 font-bold text-slate-900 text-[9px]">{run.approver || ''}</td>
              {/* Ô xác nhận */}
              <td className="border border-black p-1 font-bold text-slate-900 text-[9px]">{run.verifier || ''}</td>
              {/* Ô người kiểm tra */}
              <td className="border border-black p-1 font-bold text-slate-900 text-[9px]">{run.inspector}</td>
              {/* Ô ngày kiểm tra */}
              <td className="border border-black p-1 font-mono font-bold text-slate-900 text-[9px]">{run.checkDate.split('-').reverse().join('.')}</td>
            </tr>
          </tbody>
        </table>

        {/* SƠ ĐỒ VỊ TRÍ ĐO */}
        <div className="border border-black border-t-0 p-3 bg-white flex flex-col items-center justify-center relative min-h-[160px] max-h-[220px] overflow-hidden">
          <span className="absolute top-2 left-3 text-[9px] font-extrabold text-gray-700 uppercase tracking-widest bg-gray-100 border border-gray-300 px-2 py-0.5 rounded">* Sơ đồ vị trí đo:</span>
          
          <div className="relative mt-4">
            <img 
              src={program.imageSrc} 
              className="max-h-[150px] w-auto block object-contain grayscale"
              alt="Drawing diagram"
            />
            {/* Vẽ mốc Spotlight nhỏ gọn biểu đạt sơ đồ */}
            {program.qcItems.map(item => (
              <div 
                key={item.id}
                className="absolute border border-red-500 bg-red-400/20 text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center pointer-events-none text-red-700 shadow shadow-red-500/50"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {item.id}
              </div>
            ))}
          </div>

          <div className="absolute bottom-1.5 right-3 text-[8px] text-black font-bold flex flex-col text-right leading-tight">
            <span>Vị trí ※ không có đường parting line (2 vị trí)  ①</span>
            <span>Bậc của parting line tại vị trí ☆ Max : 0.05mm  ⑮</span>
          </div>
        </div>

        {/* BẢNG KÍCH THƯỚC ĐO LƯỜNG ĐÚNG CHUẨN */}
        <table className="w-full border-collapse border border-black text-[9px] mt-1 table-fixed text-black">
          <thead>
            <tr className="bg-gray-100 text-center font-bold">
              <th className="border border-black w-[5%] p-1 leading-tight text-black">Điểm quan trọng</th>
              <th className="border border-black w-[4%] p-1 text-black">STT</th>
              <th className="border border-black w-[15%] p-1 text-left text-black">Hạng mục kiểm tra</th>
              <th className="border border-black w-[18%] p-1 text-left text-black">Tiêu chuẩn kỹ thuật</th>
              <th className="border border-black w-[10%] p-0 text-black">
                <div className="border-b border-black py-0.5 leading-none">Điểm quan trọng</div>
                <div className="flex text-[7.5px]">
                  <span className="w-1/2 border-r border-black py-0.5">Min</span>
                  <span className="w-1/2 py-0.5">Max</span>
                </div>
              </th>
              <th className="border border-black w-[10%] p-1 text-black">Dụng cụ kiểm tra</th>
              <th className="border border-black w-[10%] p-1 text-black">Tần suất xác nhận</th>
              <th className="border border-black w-[20%] p-0 text-black">
                <div className="border-b border-black py-0.5 leading-none text-[8px]">Cavity / Mẫu</div>
                <div className="flex text-[8px]">
                  <span className="w-1/4 border-r border-black py-0.5">1</span>
                  <span className="w-1/4 border-r border-black py-0.5">2</span>
                  <span className="w-1/4 border-r border-black py-0.5">3</span>
                  <span className="w-1/4 py-0.5">4</span>
                </div>
              </th>
              <th className="border border-black w-[8%] p-0 text-black">
                <div className="border-b border-black py-0.5 leading-none">Kết quả</div>
                <div className="flex text-[7.5px]">
                  <span className="w-1/2 border-r border-black py-0.5">OK</span>
                  <span className="w-1/2 py-0.5">NG</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {program.qcItems.map((item) => {
              const res = run.results[item.id];
              const summaryStatus = evalSummary(res, item);

              // Helper hiển thị STT khoanh tròn Unicode
              const renderSTT = (id: number) => {
                const circles = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
                if (id >= 1 && id <= 20) {
                  return <span className="text-[12px] font-black text-black">{circles[id]}</span>;
                }
                return (
                  <span className="w-4 h-4 rounded-full border border-black flex items-center justify-center font-bold text-[8px] mx-auto bg-white text-black">
                    {id}
                  </span>
                );
              };

              return (
                <tr key={item.id} className="text-center hover:bg-gray-50/50">
                  {/* Cột 1: Ký hiệu S đỏ trong tam giác ngược */}
                  <td className="border border-black p-0.5 font-bold">
                    {item.isCritical && (
                      <div className="flex justify-center items-center">
                        <svg className="w-4.5 h-4.5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12,22 22,5 2,5" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                          <text x="12" y="16" fontSize="10.5" fontFamily="sans-serif" fontWeight="950" fill="currentColor" textAnchor="middle">S</text>
                        </svg>
                      </div>
                    )}
                  </td>
                  
                  {/* Cột 2: STT */}
                  <td className="border border-black p-0.5 font-bold bg-gray-50">{renderSTT(item.id)}</td>
                  
                  {/* Cột 3: Hạng mục */}
                  <td className="border border-black p-1 text-left font-semibold leading-tight">{item.name}</td>
                  
                  {/* Cột 4: Tiêu chuẩn */}
                  <td className="border border-black p-1 text-left font-medium leading-tight text-gray-700">{item.standard}</td>
                  
                  {/* Cột 5: Min / Max */}
                  <td className="border border-black p-0 text-[8px] font-mono leading-none">
                    {item.isNumerical ? (
                      <div className="flex h-full items-stretch">
                        <span className="w-1/2 border-r border-slate-300 py-1 flex items-center justify-center bg-gray-50/40">
                          {item.minLimit !== undefined ? item.minLimit : ''}
                        </span>
                        <span className="w-1/2 py-1 flex items-center justify-center font-bold">
                          {item.maxLimit !== undefined ? item.maxLimit : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[7.5px] text-gray-400 block py-1">-</span>
                    )}
                  </td>
                  
                  {/* Cột 6: Dụng cụ */}
                  <td className="border border-black p-1 font-semibold">{item.tool}</td>
                  
                  {/* Cột 7: Tần suất */}
                  <td className="border border-black p-1 font-mono text-[8px] font-semibold text-gray-600">{item.frequency}</td>
                  
                  {/* Cột 8: Nhập kết quả đo 4 Cavity */}
                  <td className="border border-black p-0 font-mono text-[8.5px] h-full">
                    {item.isNumerical ? (
                      <div className="flex h-full items-stretch">
                        <span className={`w-1/4 border-r border-slate-300 py-1 flex items-center justify-center ${res?.sample1 && evalSample(res.sample1, item) !== 'OK' ? 'font-bold bg-rose-50 text-rose-950 border border-rose-200' : ''}`}>
                          {res?.sample1 || ''}
                        </span>
                        <span className={`w-1/4 border-r border-slate-300 py-1 flex items-center justify-center ${res?.sample2 && evalSample(res.sample2, item) !== 'OK' ? 'font-bold bg-rose-50 text-rose-950 border border-rose-200' : ''}`}>
                          {res?.sample2 || ''}
                        </span>
                        <span className={`w-1/4 border-r border-slate-300 py-1 flex items-center justify-center ${res?.sample3 && evalSample(res.sample3, item) !== 'OK' ? 'font-bold bg-rose-50 text-rose-950 border border-rose-200' : ''}`}>
                          {res?.sample3 || ''}
                        </span>
                        <span className={`w-1/4 py-1 flex items-center justify-center ${res?.sample4 && evalSample(res.sample4, item) !== 'OK' ? 'font-bold bg-rose-50 text-rose-950 border border-rose-200' : ''}`}>
                          {res?.sample4 || ''}
                        </span>
                      </div>
                    ) : (
                      <div className="p-1 text-left text-[8px] leading-tight break-words font-sans text-gray-700 font-bold">
                        {res?.sample1 || ''}
                      </div>
                    )}
                  </td>
                  
                  {/* Cột 9: Đánh giá mốc (Chia OK/NG tự động điền ✓) */}
                  <td className="border border-black p-0 text-[10px] font-black h-full">
                    <div className="flex h-full items-stretch min-h-[22px]">
                      <span className="w-1/2 border-r border-black flex items-center justify-center font-bold">
                        {summaryStatus === 'OK' && <span className="text-black font-black text-xs">✓</span>}
                      </span>
                      <span className="w-1/2 flex items-center justify-center font-bold text-red-600 bg-red-50/20">
                        {summaryStatus === 'NG' && <span className="text-red-600 font-black text-xs">✓</span>}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* DÒNG CHÚ Ý THEO BIỂU MẪU */}
        <p className="font-sans italic text-[8.5px] font-bold text-black mt-1 block tracking-wide">
          * Chú ý: Khi kiểm tra phát sinh 1 pcs NG bộ phận QC có thể yêu cầu trả lại toàn bộ Lot đó cho NCC.
        </p>

        {/* KHU VỰC CHÂN TRANG: TỔNG SỐ LƯỢNG NHẬP, LỊCH SỬ SỬA ĐỔI */}
        <div className="grid grid-cols-12 border border-black mt-1 text-[8.5px] table-fixed">
          
          {/* Cột bên trái: Thông tin kiểm tra */}
          <div className="col-span-4 border-r border-black flex flex-col justify-between text-black">
            <div className="border-b border-black bg-gray-50 p-1 flex justify-between items-center font-bold">
              <span>Nội dung kiểm tra:</span>
              <span className="font-normal font-sans italic text-[8px]">Kiểm tra linh kiện đầu vào</span>
            </div>
            <div className="flex-1 p-2 bg-white flex flex-col justify-center">
              <div className="flex items-center justify-between font-bold mb-1 pb-1 border-b border-dashed border-gray-200">
                <span>Tổng số lượng nhập:</span>
                <span className="font-mono text-[10px] text-black font-black">{run.importQty || ''}</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span>Số lô / lot kiểm tra:</span>
                <span className="font-mono text-[10px] text-black font-black">{run.lotNo || ''}</span>
              </div>
            </div>
            
            <div className="border-t border-black p-1 flex items-center justify-center gap-2 bg-gray-50/50">
              <span className="font-bold">Điểm quan trọng:</span>
              <div className="flex items-center">
                <svg className="w-4.5 h-4.5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,22 22,5 2,5" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                  <text x="12" y="16" fontSize="10.5" fontFamily="sans-serif" fontWeight="950" fill="currentColor" textAnchor="middle">S</text>
                </svg>
              </div>
            </div>
          </div>

          {/* Cột giữa & phải: Lịch lý sửa đổi (Khớp 100% form chuẩn của người dùng) */}
          <div className="col-span-8 flex text-black">
            {/* Cột xoay dọc màu xám: Lý lịch sửa đổi */}
            <div className="w-[6%] bg-gray-100 border-r border-black flex items-center justify-center text-center font-bold p-1 text-[8px] leading-tight vertical-text">
              Lý lịch sửa đổi
            </div>
            
            {/* Bảng danh sách sửa đổi */}
            <div className="w-[94%] flex flex-col">
              {/* Tiêu đề bảng sửa đổi */}
              <div className="grid grid-cols-12 bg-gray-50 border-b border-black text-center font-bold py-0.5 text-[7.5px] leading-none">
                <span className="col-span-2 border-r border-black py-0.5">Lần sửa đổi</span>
                <span className="col-span-2 border-r border-black py-0.5">Ngày</span>
                <span className="col-span-5 border-r border-black py-0.5">Nội dung</span>
                <span className="col-span-2 border-r border-black py-0.5">Duyệt</span>
                <span className="col-span-1 py-0.5">Lập</span>
              </div>
              
              {/* 5 Hàng sửa đổi cố định từ 4 xuống 00 */}
              <div className="flex-1 flex flex-col">
                {(() => {
                  const revKeys = ['4', '3', '2', '1', '00'];
                  return revKeys.map((key) => {
                    const rev = program.revisions.find(r => r.rev === key || r.rev === '0' + key || (key === '00' && (r.rev === '00' || r.rev === '0')));
                    return (
                      <div key={key} className="grid grid-cols-12 text-center text-[7.5px] leading-tight border-b border-black last:border-0 h-5 items-center font-sans font-medium">
                        <span className="col-span-2 border-r border-black h-full flex items-center justify-center font-bold font-mono">
                          {key}
                        </span>
                        <span className="col-span-2 border-r border-black h-full flex items-center justify-center font-mono">
                          {rev ? rev.date.split('-').reverse().join('.') : ''}
                        </span>
                        <span className="col-span-5 border-r border-black h-full flex items-center justify-start text-left px-1 truncate font-semibold">
                          {rev ? rev.content : ''}
                        </span>
                        <span className="col-span-2 border-r border-black h-full flex items-center justify-center truncate font-bold">
                          {rev ? rev.approver : ''}
                        </span>
                        <span className="col-span-1 h-full flex items-center justify-center truncate font-bold text-gray-700">
                          {rev ? rev.creator : ''}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* CHÂN TRANG BIỂU MẪU */}
        <div className="flex justify-between items-center text-[8px] mt-2 font-mono text-gray-500 font-bold">
          <span>Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
          <span className="font-sans italic">Thời gian lưu trữ 20 năm từ khi kết thúc đời xe.</span>
        </div>

      </div>

      </div>
    </div>
  );
}
