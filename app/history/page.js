'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  // รายการประวัติการขายทั้งหมด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // โหลดข้อมูลเมื่อเปิดหน้า
  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);

    // ดึงข้อมูลจากตาราง sales เรียงจากล่าสุดไปเก่าสุด (sold_at descending)
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setSales(data);
      setError('');
    }
    setLoading(false);
  }

  // คำนวณยอดขายรวมทั้งหมด (sum ของ total_price)
  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.total_price || 0),
    0
  );

  // แปลง timestamp ให้อ่านง่ายแบบไทย
  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {error && (
        <p style={{ color: '#dc2626', fontWeight: 600 }}>เกิดข้อผิดพลาด: {error}</p>
      )}

      {/* สรุปยอดขายรวมทั้งหมด */}
      <div className="card">
        <div style={{ color: '#6b7280', fontSize: '14px' }}>ยอดขายรวมทั้งหมด</div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a' }}>
          {totalRevenue.toFixed(2)} บาท
        </div>
        <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
          จำนวน {sales.length} รายการ
        </div>
      </div>

      {/* ตารางประวัติการขาย */}
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วันที่/เวลา</th>
              <th>สินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={4}>ยังไม่มีประวัติการขาย</td>
              </tr>
            )}
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDate(sale.sold_at)}</td>
                <td>{sale.product_name}</td>
                <td>{sale.quantity}</td>
                <td>{Number(sale.total_price).toFixed(2)} บาท</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
