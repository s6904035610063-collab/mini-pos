'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  // รายการสินค้าทั้งหมดสำหรับ dropdown
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // สินค้าที่เลือกและจำนวนที่จะขาย
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // โหลดรายการสินค้าเมื่อเปิดหน้า
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setProducts(data);
      setError('');
    }
    setLoadingProducts(false);
  }

  // หา object สินค้าที่ถูกเลือกอยู่ตอนนี้ (ใช้คำนวณราคาและ stock)
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // คำนวณยอดรวม = ราคา x จำนวน
  const qtyNumber = parseInt(quantity, 10) || 0;
  const totalPrice = selectedProduct ? selectedProduct.price * qtyNumber : 0;

  function resetForm() {
    setSelectedProductId('');
    setQuantity('');
  }

  async function handleSell(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!selectedProductId) {
      setError('กรุณาเลือกสินค้า');
      return;
    }
    if (!qtyNumber || qtyNumber <= 0) {
      setError('กรุณากรอกจำนวนที่ถูกต้อง');
      return;
    }

    setSubmitting(true);

    // ดึงข้อมูลสินค้าล่าสุดจาก DB อีกครั้งเพื่อเช็ค stock ที่แม่นยำ
    // (ป้องกันกรณี stock เปลี่ยนไปตั้งแต่โหลดหน้า)
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', selectedProductId)
      .single();

    if (fetchError || !currentProduct) {
      setError('ไม่พบข้อมูลสินค้า กรุณาลองใหม่');
      setSubmitting(false);
      return;
    }

    // ตรวจสอบว่า stock เพียงพอหรือไม่
    if (currentProduct.stock < qtyNumber) {
      setError(`สินค้าคงเหลือไม่พอ (คงเหลือ ${currentProduct.stock} ${currentProduct.unit})`);
      setSubmitting(false);
      return;
    }

    const total = currentProduct.price * qtyNumber;

    // 1) บันทึกรายการขายลงตาราง sales
    const { error: saleError } = await supabase.from('sales').insert([
      {
        product_id: currentProduct.id,
        product_name: currentProduct.name,
        quantity: qtyNumber,
        total_price: total,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (saleError) {
      setError(saleError.message);
      setSubmitting(false);
      return;
    }

    // 2) อัปเดต stock ในตาราง products ให้ลดลงตามจำนวนที่ขาย
    const newStock = currentProduct.stock - qtyNumber;
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', currentProduct.id);

    if (updateError) {
      setError('บันทึกการขายสำเร็จ แต่ปรับ stock ไม่สำเร็จ: ' + updateError.message);
      setSubmitting(false);
      return;
    }

    // สำเร็จ: แจ้งเตือนและรีเซ็ตฟอร์ม
    setSuccessMessage(
      `ขาย "${currentProduct.name}" จำนวน ${qtyNumber} ${currentProduct.unit} สำเร็จ (รวม ${total.toFixed(2)} บาท)`
    );
    resetForm();
    fetchProducts(); // โหลด stock ล่าสุดมาแสดงใน dropdown
    setSubmitting(false);
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {error && (
        <p style={{ color: '#dc2626', fontWeight: 600 }}>เกิดข้อผิดพลาด: {error}</p>
      )}
      {successMessage && (
        <p style={{ color: '#16a34a', fontWeight: 600 }}>{successMessage}</p>
      )}

      <div className="card" style={{ maxWidth: '420px' }}>
        {loadingProducts ? (
          <p>กำลังโหลดรายการสินค้า...</p>
        ) : (
          <form onSubmit={handleSell}>
            {/* Dropdown เลือกสินค้า */}
            <div className="form-group">
              <label>เลือกสินค้า</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({Number(product.price).toFixed(2)} บาท) — คงเหลือ {product.stock}
                  </option>
                ))}
              </select>
            </div>

            {/* ช่องกรอกจำนวน */}
            <div className="form-group">
              <label>จำนวนที่ขาย</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {selectedProduct && (
                <small style={{ color: '#6b7280' }}>
                  หน่วย: {selectedProduct.unit} (คงเหลือ {selectedProduct.stock})
                </small>
              )}
            </div>

            {/* แสดงยอดรวมอัตโนมัติ */}
            <div className="form-group">
              <label>ยอดรวม</label>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#2563eb' }}>
                {totalPrice.toFixed(2)} บาท
              </div>
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'ขาย'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
