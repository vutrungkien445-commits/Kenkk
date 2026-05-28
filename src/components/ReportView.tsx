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
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Xem thử bản in Báo Cáo Đo Lường</h2>
          <p className="text-[11px] text-slate-400">Thiết kế căn chỉnh 100% khớp biểu mẫu nhà máy <b>Form VQC - 002 - 01</b></p>
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
        
        {/* TIÊU ĐỀ BIỂU MẪU */}
        <div className="grid grid-cols-12 border border-black mb-3">
          
          {/* Logo SRK-HV */}
          <div className="col-span-2 border-r border-black flex items-center justify-center p-2 bg-white">
            <svg className="w-14 h-14" viewBox="0 0 100 100">
              <polygon points="50,5 95,50 50,95 5,50" fill="#0c1b40" stroke="#000000" strokeWidth="1.5"/>
              <text x="50" y="44" fontFamily="sans-serif" fontWeight="950" fontSize="16" fill="#ffffff" textAnchor="middle">SRK</text>
              <line x1="22" y1="52" x2="78" y2="52" stroke="#ffffff" strokeWidth="2"/>
              <text x="50" y="73" fontFamily="sans-serif" fontWeight="900" fontSize="15" fill="#ffffff" textAnchor="middle">HV</text>
            </svg>
          </div>

          {/* Tiêu đề chính */}
          <div className="col-span-7 border-r border-black flex flex-col items-center justify-center p-2 text-center">
            <h1 className="text-base md:text-lg font-black tracking-wide text-black font-sans uppercase">TIÊU CHUẨN KIỂM TRA (IN PUT)</h1>
          </div>

          {/* Cột quản lý */}
          <div className="col-span-3 flex flex-col text-[10px] bg-white">
            <div className="flex border-b border-black">
              <span className="w-2/5 p-1 border-r border-black font-semibold text-center bg-gray-100">Form</span>
              <span className="w-3/5 p-1 font-bold text-center">VQC - 002 - 01</span>
            </div>
            <div className="flex border-b border-black">
              <span className="w-2/5 p-1 border-r border-black font-semibold text-center bg-gray-100">Ngày ban hành:</span>
              <span className="w-3/5 p-1 font-mono text-center">30/01/2018</span>
            </div>
            <div className="flex">
              <span className="w-2/5 p-1 border-r border-black font-semibold text-center bg-gray-100">Số quản lý:</span>
              <span className="w-3/5 p-1 font-mono text-center">VQC - 002 - 001</span>
            </div>
          </div>
        </div>

        {/* THÔNG TIN LINH KIỆN & KIỂM TRA */}
        <div className="grid grid-cols-12 border border-black border-b-0 text-[10.5px]">
          <div className="col-span-2 border-r border-black p-1.5 font-bold bg-gray-50 flex items-center">Mã linh kiện</div>
          <div className="col-span-2 border-r border-black p-1.5 font-mono font-bold text-center flex items-center justify-center">{program.partCode}</div>
          
          <div className="col-span-2 border-r border-black p-1.5 font-bold bg-gray-50 text-center flex items-center justify-center">Đánh giá</div>
          <div className="col-span-2 border-r border-black p-1 py-0 flex items-center justify-center text-center font-black">
            {overallStatus === 'OK' && <span className="text-green-700 bg-green-50 border border-green-300 px-2 py-0.5 rounded font-black text-xs">OK</span>}
            {overallStatus === 'NG' && <span className="text-red-700 bg-red-50 border border-red-300 px-2 py-0.5 rounded font-black text-xs">NG</span>}
            {overallStatus === 'PENDING' && <span className="text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded font-black text-xs">ĐANG ĐO</span>}
          </div>

          <div className="col-span-1 border-r border-black p-1.5 font-bold bg-gray-50 text-center flex items-center justify-center">Phê duyệt</div>
          <div className="col-span-1 border-r border-black p-1.5 text-center flex items-center justify-center font-bold">{run.approver || 'Long'}</div>
          
          <div className="col-span-1 border-r border-black p-1.5 font-bold bg-gray-50 text-center flex items-center justify-center">Xác nhận</div>
          <div className="col-span-1 p-1.5 text-center flex items-center justify-center font-bold">{run.verifier || 'Fukushima'}</div>
        </div>

        <div className="grid grid-cols-12 border border-black text-[10.5px] border-b-2">
          <div className="col-span-2 border-r border-black p-1.5 font-bold bg-gray-50 flex items-center">Tên linh kiện</div>
          <div className="col-span-6 border-r border-black p-1.5 font-bold flex items-center">{program.partName}</div>
          
          <div className="col-span-2 border-r border-black p-1.5 font-bold bg-gray-50 flex items-center justify-center text-center">Người kiểm tra</div>
          <div className="col-span-2 p-1.5 text-center font-bold text-center flex items-center justify-center">{run.inspector}</div>
        </div>

        {/* SƠ ĐỒ VỊ TRÍ ĐO */}
        <div className="border border-black border-t-0 p-3 bg-white flex flex-col items-center justify-center relative min-h-[160px] max-h-[220px] overflow-hidden">
          <span className="absolute top-2 left-3 text-[10px] font-extrabold text-gray-700 uppercase tracking-widest bg-gray-100 border border-gray-300 px-2 py-0.5 rounded">* Sơ đồ vị trí đo:</span>
          
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

          <div className="absolute bottom-2 right-3 text-[8.5px] text-gray-500 font-mono flex flex-col text-right">
            <span>Vị trí ※ không có đường parting line (2 vị trí)</span>
            <span>Bậc của parting line tại vị trí ☆: Max 0.05mm</span>
          </div>
        </div>

        {/* BẢNG KÍCH THƯỚC ĐO LƯỜNG ĐÚNG CHUẨN */}
        <table className="w-full border-collapse border border-black text-[9.5px] mt-2 table-fixed">
          <thead>
            <tr className="bg-gray-100 text-center font-bold">
              <th className="border border-black w-[4%] p-1 leading-tight">Điểm Q.Trọng</th>
              <th className="border border-black w-[4%] p-1">STT</th>
              <th className="border border-black w-[15%] p-1 text-left">Hạng mục kiểm tra</th>
              <th className="border border-black w-[18%] p-1 text-left">Tiêu chuẩn kỹ thuật</th>
              <th className="border border-black w-[9%] p-1 flex-col">
                <div className="border-b border-black py-0.5 leading-none">Dung sai</div>
                <div className="flex text-[8px]">
                  <span className="w-1/2 border-r border-black py-0.5">Min</span>
                  <span className="w-1/2 py-0.5">Max</span>
                </div>
              </th>
              <th className="border border-black w-[10%] p-1">Dụng cụ kiểm</th>
              <th className="border border-black w-[10%] p-1">Tần suất xác nhận</th>
              <th className="border border-black w-[22%] p-0">
                <div className="border-b border-black py-0.5 leading-none text-[8.5px]">Cavity / Mẫu</div>
                <div className="flex text-[8.5px]">
                  <span className="w-1/4 border-r border-black py-0.5">1</span>
                  <span className="w-1/4 border-r border-black py-0.5">2</span>
                  <span className="w-1/4 border-r border-black py-0.5">3</span>
                  <span className="w-1/4 py-0.5">4</span>
                </div>
              </th>
              <th className="border border-black w-[8%] p-1">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {program.qcItems.map((item) => {
              const res = run.results[item.id];
              const summaryStatus = evalSummary(res, item);

              return (
                <tr key={item.id} className="text-center hover:bg-gray-50/50">
                  {/* Cột 1: Ký hiệu S đỏ hoặc S trong tam giác */}
                  <td className="border border-black p-0.5 font-bold">
                    {item.isCritical && (
                      <div className="flex justify-center items-center">
                        <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12,2 22,20 2,20" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                          <text x="12" y="17.5" fontSize="10" fontFamily="sans-serif" fontWeight="950" fill="currentColor" textAnchor="middle">S</text>
                        </svg>
                      </div>
                    )}
                  </td>
                  
                  {/* Cột 2: STT */}
                  <td className="border border-black p-1 font-mono font-bold bg-gray-50">{item.id}</td>
                  
                  {/* Cột 3: Hạng mục */}
                  <td className="border border-black p-1 text-left font-semibold leading-tight">{item.name}</td>
                  
                  {/* Cột 4: Tiêu chuẩn */}
                  <td className="border border-black p-1 text-left font-medium leading-tight">{item.standard}</td>
                  
                  {/* Cột 5: Min / Max */}
                  <td className="border border-black p-0 text-[8.5px] font-mono leading-none">
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
                  <td className="border border-black p-1 font-medium">{item.tool}</td>
                  
                  {/* Cột 7: Tần suất */}
                  <td className="border border-black p-1 font-mono text-[8.5px] font-medium text-gray-600">{item.frequency}</td>
                  
                  {/* Cột 8: Nhập kết quả đo 4 Cavity */}
                  <td className="border border-black p-0 font-mono text-[9px] h-full">
                    {item.isNumerical ? (
                      <div className="flex h-full items-stretch">
                        <span className={`w-1/4 border-r border-slate-300 py-1 flex items-center justify-center ${res?.sample1 && evalSample(res.sample1, item) !== 'OK' ? 'font-bold bg-amber-50 text-amber-900 border border-amber-300' : ''}`}>
                          {res?.sample1 || ''}
                        </span>
                        <span className={`w-1/4 border-r border-slate-300 py-1 flex items-center justify-center ${res?.sample2 && evalSample(res.sample2, item) !== 'OK' ? 'font-bold bg-amber-50 text-amber-900 border border-amber-300' : ''}`}>
                          {res?.sample2 || ''}
                        </span>
                        <span className={`w-1/4 border-r border-slate-300 py-1 flex items-center justify-center ${res?.sample3 && evalSample(res.sample3, item) !== 'OK' ? 'font-bold bg-amber-50 text-amber-900 border border-amber-300' : ''}`}>
                          {res?.sample3 || ''}
                        </span>
                        <span className={`w-1/4 py-1 flex items-center justify-center ${res?.sample4 && evalSample(res.sample4, item) !== 'OK' ? 'font-bold bg-amber-50 text-amber-900 border border-amber-300' : ''}`}>
                          {res?.sample4 || ''}
                        </span>
                      </div>
                    ) : (
                      <div className="p-1 text-left text-[8.5px] leading-tight break-words font-sans text-gray-700 font-medium">
                        {res?.sample1 || ''}
                      </div>
                    )}
                  </td>
                  
                  {/* Cột 9: Đánh giá mốc */}
                  <td className="border border-black p-0.5 font-bold h-full">
                    <div className="flex items-center justify-center h-full">
                      {summaryStatus === 'OK' && (
                        <span className="text-emerald-800 bg-emerald-100/60 border border-emerald-300 px-1 py-0.2 rounded text-[8px] badge-print-ok uppercase">ok</span>
                      )}
                      {(summaryStatus === 'Cận Min' || summaryStatus === 'Cận Max') && (
                        <span className="text-amber-800 bg-amber-100/60 border border-amber-300 px-1 py-0.2 rounded text-[7.5px] badge-print-warning uppercase leading-tight font-black">cận biên</span>
                      )}
                      {summaryStatus === 'NG' && (
                        <span className="text-rose-800 bg-rose-100 border border-rose-300 px-1 py-0.2 rounded text-[8px] badge-print-ng uppercase font-black">ng</span>
                      )}
                      {summaryStatus === 'CHƯA ĐO' && (
                        <span className="text-gray-400 text-[7px] italic block font-normal">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* DÒNG CHÚ Ý THEO BIỂU MẪU */}
        <p className="font-sans italic text-[8.5px] font-bold text-gray-800 mt-2 block tracking-wide">
          * Chú ý: Khi kiểm tra phát sinh 1 pcs NG bộ phận QC có thể yêu cầu trả lại toàn bộ Lot đó cho NCC.
        </p>

        {/* KHU VỰC KHÁC: TỔNG SỐ LƯỢNG NHẬP, LỊCH SỬ SỬA ĐỔI */}
        <div className="grid grid-cols-12 border border-black mt-2 text-[8.5px] table-fixed">
          
          {/* Cột bên trái: Nội dung kiểm tra và tổng số lượng nhập */}
          <div className="col-span-4 border-r border-black flex flex-col">
            <div className="border-b border-black bg-gray-50 p-1 flex justify-between items-center font-bold">
              <span>Nội dung kiểm tra:</span>
              <span className="font-normal font-sans italic">Kiểm tra linh kiện đầu vào</span>
            </div>
            <div className="flex-1 p-2 bg-white flex flex-col justify-center">
              <div className="flex items-center justify-between font-bold mb-1.5 border-b border-dashed border-gray-300 pb-1">
                <span>Tổng số lượng nhập:</span>
                <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-black">{run.importQty || '14000'}</span>
              </div>
              <div className="flex items-center justify-between font-bold">
                <span>Số lô / lot kiểm tra:</span>
                <span className="font-mono text-xs text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-bold">{run.lotNo || 'LOT-2026A'}</span>
              </div>
            </div>
            
            <div className="border-t border-black p-1.5 flex items-center justify-center gap-1.5 bg-gray-50/50">
              <span className="font-bold">Điểm quan trọng:</span>
              <div className="flex items-center gap-0.5">
                <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,2 22,20 2,20" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                  <text x="12" y="17.5" fontSize="10" fontFamily="sans-serif" fontWeight="950" fill="currentColor" textAnchor="middle">S</text>
                </svg>
              </div>
            </div>
          </div>

          {/* Cột giữa: Lịch sử sửa đổi của bản vẽ */}
          <div className="col-span-8 flex flex-col">
            <div className="grid grid-cols-12 bg-gray-50 border-b border-black text-center font-bold py-1">
              <span className="col-span-2 border-r border-slate-300">Lần sửa đổi</span>
              <span className="col-span-3 border-r border-slate-300">Ngày</span>
              <span className="col-span-4 border-r border-slate-300">Nội dung</span>
              <span className="col-span-1.5 border-r border-slate-300 col-span-2">Duyệt</span>
              <span className="col-span-1.5 col-span-1">Lập</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
              {/* Lấy tối đa 5 sửa đổi lấp đầy bảng */}
              {Array.from({ length: 5 }).map((_, index) => {
                const rev = program.revisions[index];
                return (
                  <div key={index} className="grid grid-cols-12 text-center py-1 border-b border-[#ddd] last:border-0 font-medium font-sans">
                    <span className="col-span-2 border-r border-[#ddd] font-mono font-bold text-gray-500">
                      {rev ? rev.rev : ''}
                    </span>
                    <span className="col-span-3 border-r border-[#ddd] font-mono text-gray-600">
                      {rev ? rev.date : ''}
                    </span>
                    <span className="col-span-4 border-r border-[#ddd] text-left px-1.5 leading-tight text-gray-700 truncate font-semibold">
                      {rev ? rev.content : ''}
                    </span>
                    <span className="col-span-1.5 border-r border-[#ddd] col-span-2 truncate font-semibold">
                      {rev ? rev.approver : ''}
                    </span>
                    <span className="col-span-1.5 col-span-1 truncate font-semibold text-gray-600">
                      {rev ? rev.creator : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CHÂN TRANG BIỂU MẪU */}
        <div className="flex justify-between items-center text-[8.5px] mt-4 font-mono text-gray-400 font-medium">
          <span>Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
          <span className="font-sans italic font-bold">Thời gian lưu trữ 20 năm từ khi kết thúc đời xe.</span>
        </div>

      </div>
    </div>
  );
}
