import type { FieldDefinition, FieldKey, CarrierOption } from './types';

export const FIELD_DEFINITIONS: Record<FieldKey, FieldDefinition> = {
  carrier_tracking: {
    label: 'Carrier Tracking *',
    required: true,
    type: 'string',
    validation: (v) => !!v && String(v).trim().length > 0,
    errorMsg: 'Tracking number is required',
  },
  boxme_tracking: {
    label: 'Boxme Tracking',
    required: false,
    type: 'string',
    validation: (v) => !v || String(v).trim().length > 0,
    errorMsg: 'Invalid Boxme tracking format',
  },
  weight: {
    label: 'Weight (kg)',
    required: false,
    type: 'number',
    validation: (v) => !v || (!isNaN(parseFloat(String(v))) && parseFloat(String(v)) >= 0 && parseFloat(String(v)) < 500),
    errorMsg: 'Weight must be 0-500 kg',
  },
  volumetric_weight: {
    label: 'Volumetric Weight',
    required: false,
    type: 'number',
    validation: (v) => !v || (!isNaN(parseFloat(String(v))) && parseFloat(String(v)) >= 0),
    errorMsg: 'Volumetric weight must be a positive number',
  },
  fee: {
    label: 'Shipping Fee',
    required: false,
    type: 'number',
    validation: (v) => !v || (!isNaN(parseFloat(String(v))) && parseFloat(String(v)) >= 0),
    errorMsg: 'Fee must be a positive number',
  },
  cod_amount: {
    label: 'COD Amount',
    required: false,
    type: 'number',
    validation: (v) => !v || (!isNaN(parseFloat(String(v))) && parseFloat(String(v)) >= 0),
    errorMsg: 'COD must be a positive number',
  },
  return_fee: {
    label: 'Return Fee',
    required: false,
    type: 'number',
    validation: (v) => !v || (!isNaN(parseFloat(String(v))) && parseFloat(String(v)) >= 0),
    errorMsg: 'Return fee must be a positive number',
  },
  insurance_fee: {
    label: 'Insurance Fee',
    required: false,
    type: 'number',
    validation: (v) => !v || (!isNaN(parseFloat(String(v))) && parseFloat(String(v)) >= 0),
    errorMsg: 'Insurance fee must be a positive number',
  },
  other_fees: {
    label: 'Other Fees',
    required: false,
    type: 'number',
    validation: (v) => !v || !isNaN(parseFloat(String(v))),
    errorMsg: 'Other fees must be a number',
  },
  status: {
    label: 'Delivery Status',
    required: false,
    type: 'string',
    validation: () => true,
    errorMsg: '',
  },
};

export const COLUMN_HINTS: Record<FieldKey, string[]> = {
  carrier_tracking: ['tracking', 'tracking_no', 'tracking_number', 'awb', 'waybill', 'bill_code', 'order_code', 'ma_van_don', 'mã vận đơn', 'เลขพัสดุ', 'รหัสพัสดุ', 'consignment', 'shipment_id', 'pno'],
  boxme_tracking: ['boxme', 'bx_tracking', 'internal_code', 'ref', 'reference', 'merchant_order'],
  weight: ['weight', 'actual_weight', 'charged_weight', 'chargeable_weight', 'kg', 'khoi_luong', 'cân nặng', 'น้ำหนัก', 'trong_luong'],
  volumetric_weight: ['volumetric', 'dim_weight', 'cbm', 'volume_weight'],
  fee: ['fee', 'shipping_fee', 'freight', 'total_fee', 'delivery_fee', 'phi_van_chuyen', 'cuoc_phi', 'ค่าขนส่ง', 'ค่าจัดส่ง'],
  cod_amount: ['cod', 'cod_amount', 'collect', 'tien_thu_ho'],
  return_fee: ['return_fee', 'phi_hoan', 'ค่าคืน'],
  insurance_fee: ['insurance', 'insurance_fee', 'phi_bao_hiem', 'ค่าประกัน'],
  other_fees: ['other', 'other_fees', 'phi_khac', 'ค่าอื่น'],
  status: ['status', 'trang_thai', 'delivery_status', 'สถานะ'],
};

export const CARRIER_OPTIONS: CarrierOption[] = [
  { value: 'GHN', label: 'GHN (Giao Hàng Nhanh)', group: 'Vietnam' },
  { value: 'GHTK', label: 'GHTK (Giao Hàng Tiết Kiệm)', group: 'Vietnam' },
  { value: 'VTP', label: 'Viettel Post', group: 'Vietnam' },
  { value: 'JT_VN', label: 'J&T Express VN', group: 'Vietnam' },
  { value: 'NINJA_VN', label: 'Ninja Van VN', group: 'Vietnam' },
  { value: 'BEST', label: 'Best Express', group: 'Vietnam' },
  { value: 'SPX_VN', label: 'Shopee Express VN', group: 'Vietnam' },
  { value: 'KERRY', label: 'Kerry Express', group: 'Thailand' },
  { value: 'FLASH', label: 'Flash Express', group: 'Thailand' },
  { value: 'JT_TH', label: 'J&T Express TH', group: 'Thailand' },
  { value: 'NINJA_TH', label: 'Ninja Van TH', group: 'Thailand' },
  { value: 'SPX_TH', label: 'Shopee Express TH', group: 'Thailand' },
];
