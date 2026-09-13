'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProductsPage() {
  // รายการสินค้าทั้งหมด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ฟอร์มเพิ่มสินค้าใหม่
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    price: '',
    stock: '',
    unit: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // แถวที่กำลังแก้ไขแบบ inline (เก็บ id ของแถว)
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // ดึงข้อมูลสินค้าเมื่อโหลดหน้าครั้งแรก
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setProducts(data);
      setError('');
    }
    setLoading(false);
  }

  // จัดการค่าในฟอร์มเพิ่มสินค้า
  function handleNewProductChange(e) {
    const { name, value } = e.target;
    setNewProduct((prev) => ({ ...prev, [name]: value }));
  }

  // เพิ่มสินค้าใหม่ลงตาราง products
  async function handleAddProduct(e) {
    e.preventDefault();
    if (!newProduct.sku || !newProduct.name) {
      setError('กรุณากรอก SKU และชื่อสินค้า');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('products').insert([
      {
        sku: newProduct.sku,
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        stock: parseInt(newProduct.stock, 10) || 0,
        unit: newProduct.unit,
      },
    ]);

    if (error) {
      setError(error.message);
    } else {
      setNewProduct({ sku: '', name: '', price: '', stock: '', unit: '' });
      setError('');
      fetchProducts(); // โหลดข้อมูลใหม่หลังเพิ่มสำเร็จ
    }
    setSubmitting(false);
  }

  // เริ่มแก้ไขแถว: เก็บค่าปัจจุบันของแถวนั้นไว้ใน editValues
  function startEdit(product) {
    setEditingId(product.id);
    setEditValues({
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditValues((prev) => ({ ...prev, [name]: value }));
  }

  // บันทึกการแก้ไขสินค้า (update ตาม id)
  async function saveEdit(id) {
    const { error } = await supabase
      .from('products')
      .update({
        sku: editValues.sku,
        name: editValues.name,
        price: parseFloat(editValues.price) || 0,
        stock: parseInt(editValues.stock, 10) || 0,
        unit: editValues.unit,
      })
      .eq('id', id);

    if (error) {
      setError(error.message);
    } else {
      setError('');
      setEditingId(null);
      fetchProducts();
    }
  }

  // ลบสินค้า
  async function handleDelete(id) {
    const confirmDelete = window.confirm('ยืนยันการลบสินค้านี้?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      setError(error.message);
    } else {
      setError('');
      fetchProducts();
    }
  }

  return (
    <div>
      <h1>รายการสินค้า</h1>

      {error && (
        <p style={{ color: '#dc2626', fontWeight: 600 }}>เกิดข้อผิดพลาด: {error}</p>
      )}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>เพิ่มสินค้าใหม่</h2>
        <form
          onSubmit={handleAddProduct}
          style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}
        >
          <div className="form-group">
            <label>SKU</label>
            <input
              type="text"
              name="sku"
              value={newProduct.sku}
              onChange={handleNewProductChange}
              required
            />
          </div>
          <div className="form-group">
            <label>ชื่อสินค้า</label>
            <input
              type="text"
              name="name"
              value={newProduct.name}
              onChange={handleNewProductChange}
              required
            />
          </div>
          <div className="form-group">
            <label>ราคา</label>
            <input
              type="number"
              step="0.01"
              name="price"
              value={newProduct.price}
              onChange={handleNewProductChange}
            />
          </div>
          <div className="form-group">
            <label>คงเหลือ</label>
            <input
              type="number"
              name="stock"
              value={newProduct.stock}
              onChange={handleNewProductChange}
            />
          </div>
          <div className="form-group">
            <label>หน่วย</label>
            <input
              type="text"
              name="unit"
              value={newProduct.unit}
              onChange={handleNewProductChange}
              placeholder="ชิ้น, ขวด, กล่อง"
            />
          </div>
          <div className="form-group">
            <button type="submit" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
            </button>
          </div>
        </form>
      </div>

      {/* ตารางแสดงรายการสินค้า */}
      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อสินค้า</th>
              <th>ราคา</th>
              <th>คงเหลือ</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6}>ยังไม่มีสินค้าในระบบ</td>
              </tr>
            )}
            {products.map((product) => {
              const isEditing = editingId === product.id;
              return (
                <tr key={product.id}>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          type="text"
                          name="sku"
                          value={editValues.sku}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="name"
                          value={editValues.name}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          name="price"
                          value={editValues.price}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="stock"
                          value={editValues.stock}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          name="unit"
                          value={editValues.unit}
                          onChange={handleEditChange}
                        />
                      </td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => saveEdit(product.id)}>บันทึก</button>
                        <button onClick={cancelEdit} style={{ backgroundColor: '#6b7280' }}>
                          ยกเลิก
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{Number(product.price).toFixed(2)}</td>
                      <td>{product.stock}</td>
                      <td>{product.unit}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => startEdit(product)}>แก้ไข</button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          ลบ
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
