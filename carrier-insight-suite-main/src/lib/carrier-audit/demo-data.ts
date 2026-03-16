// Demo data for Flash Express Thailand – deterministic for consistent demo

export interface DemoData {
  carrierData: Record<string, unknown>[];
  carrierHeaders: string[];
  boxmeData: Record<string, unknown>[];
  boxmeHeaders: string[];
}

export function generateFlashExpressDemoData(): DemoData {
  const carrierHeaders = ['tracking_number', 'recipient', 'district', 'weight', 'volumetric_weight', 'shipping_fee', 'cod_amount', 'delivery_status'];
  const boxmeHeaders = ['tracking_no', 'boxme_ref', 'actual_weight', 'total_fee', 'status'];

  const carrierData: Record<string, unknown>[] = [
    { tracking_number: 'TH00000001FL', recipient: 'สมชาย', district: 'สวนหลวง', weight: 7.29, volumetric_weight: 6.5, shipping_fee: 45000, cod_amount: 150000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000002FL', recipient: 'สุดา', district: 'คลองเตย', weight: 10.84, volumetric_weight: 9.2, shipping_fee: 62000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000003FL', recipient: 'มาลี', district: 'บางนา', weight: 5.50, volumetric_weight: 5.0, shipping_fee: 35000, cod_amount: 50000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000004FL', recipient: 'วิชัย', district: 'ปทุมวัน', weight: 3.20, volumetric_weight: 3.0, shipping_fee: 28000, cod_amount: 75000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000005FL', recipient: 'invalid', district: 'test', weight: 'invalid', volumetric_weight: 'invalid', shipping_fee: -5000, cod_amount: 0, delivery_status: 'pending' },
    { tracking_number: 'TH00000006FL', recipient: 'ประเสริฐ', district: 'ดอนเมือง', weight: 8.75, volumetric_weight: 8.0, shipping_fee: 52000, cod_amount: 200000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000007FL', recipient: 'นภา', district: 'จตุจักร', weight: 2.10, volumetric_weight: 2.0, shipping_fee: 25000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000008FL', recipient: 'ธีระ', district: 'ลาดพร้าว', weight: 4.55, volumetric_weight: 4.2, shipping_fee: 32000, cod_amount: 90000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000009FL', recipient: 'อรุณ', district: 'บางกะปิ', weight: 6.30, volumetric_weight: 5.8, shipping_fee: 15000000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000010FL', recipient: 'พิชัย', district: 'มีนบุรี', weight: 1.20, volumetric_weight: 1.0, shipping_fee: 18000, cod_amount: 30000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000011FL', recipient: 'สมหญิง', district: 'พระโขนง', weight: 9.40, volumetric_weight: 8.5, shipping_fee: 58000, cod_amount: 0, delivery_status: 'returned' },
    { tracking_number: 'TH00000012FL', recipient: 'มาลี', district: 'สาทร', weight: 3.80, volumetric_weight: 3.5, shipping_fee: 30000, cod_amount: 45000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000013FL', recipient: 'วิชัย', district: 'วัฒนา', weight: 250, volumetric_weight: 200, shipping_fee: 85000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000014FL', recipient: 'สุดา', district: 'ราชเทวี', weight: 5.60, volumetric_weight: 5.0, shipping_fee: 38000, cod_amount: 120000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000015FL', recipient: 'ประเสริฐ', district: 'หลักสี่', weight: 7.90, volumetric_weight: 7.0, shipping_fee: 48000, cod_amount: 0, delivery_status: 'in_transit' },
    { tracking_number: 'TH00000016FL', recipient: 'ธีระ', district: 'บางรัก', weight: '', volumetric_weight: 3.0, shipping_fee: 28000, cod_amount: 60000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000017FL', recipient: 'นภา', district: 'ดอนเมือง', weight: 4.20, volumetric_weight: 4.0, shipping_fee: 33000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000018FL', recipient: 'สมชาย', district: 'สวนหลวง', weight: 6.10, volumetric_weight: 5.5, shipping_fee: 42000, cod_amount: 95000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000019FL', recipient: 'อรุณ', district: 'คลองเตย', weight: 2.80, volumetric_weight: 2.5, shipping_fee: 24000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000020FL', recipient: 'พิชัย', district: 'บางนา', weight: 8.30, volumetric_weight: 7.5, shipping_fee: 50000, cod_amount: 180000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000021FL', recipient: 'นภา', district: 'ราชเทวี', weight: 4.50, volumetric_weight: 4.0, shipping_fee: 32000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000022FL', recipient: 'สมศรี', district: 'จตุจักร', weight: 6.80, volumetric_weight: 6.0, shipping_fee: 48000, cod_amount: 80000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000023FL', recipient: 'มาลี', district: 'ปทุมวัน', weight: 3.40, volumetric_weight: 3.0, shipping_fee: 27000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000024FL', recipient: 'วิชัย', district: 'สาทร', weight: 5.90, volumetric_weight: 5.5, shipping_fee: 40000, cod_amount: 65000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000025FL', recipient: 'สุดา', district: 'หลักสี่', weight: 2.60, volumetric_weight: 2.0, shipping_fee: 22000, cod_amount: 0, delivery_status: 'returned' },
    { tracking_number: 'TH00000026FL', recipient: 'ธีระ', district: 'มีนบุรี', weight: 7.10, volumetric_weight: 6.5, shipping_fee: 46000, cod_amount: 110000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000027FL', recipient: 'อรุณ', district: 'ลาดพร้าว', weight: 4.70, volumetric_weight: 4.0, shipping_fee: 35000, cod_amount: 0, delivery_status: 'delivered' },
    { tracking_number: 'TH00000028FL', recipient: 'สมชาย', district: 'บางกะปิ', weight: 9.20, volumetric_weight: 8.0, shipping_fee: 56000, cod_amount: 250000, delivery_status: 'delivered' },
    { tracking_number: 'TH00000029FL', recipient: 'พิชัย', district: 'พระโขนง', weight: 1.80, volumetric_weight: 1.5, shipping_fee: 20000, cod_amount: 0, delivery_status: 'lost' },
    { tracking_number: 'TH00000030FL', recipient: 'นภา', district: 'วัฒนา', weight: 3.50, volumetric_weight: 3.0, shipping_fee: -500, cod_amount: 40000, delivery_status: 'delivered' },
  ];

  const boxmeData: Record<string, unknown>[] = [
    { tracking_no: 'TH00000001FL', boxme_ref: 'BX0100000', actual_weight: 7.00, total_fee: 44000, status: 'completed' },
    { tracking_no: 'TH00000002FL', boxme_ref: 'BX0100007', actual_weight: 10.50, total_fee: 60000, status: 'completed' },
    { tracking_no: 'TH00000003FL', boxme_ref: 'BX0100014', actual_weight: 5.50, total_fee: 35000, status: 'completed' },
    { tracking_no: 'TH00000004FL', boxme_ref: 'BX0100021', actual_weight: 3.20, total_fee: 28000, status: 'completed' },
    { tracking_no: 'TH00000005FL', boxme_ref: 'BX0100028', actual_weight: 2.00, total_fee: 25000, status: 'completed' },
    { tracking_no: 'TH00000006FL', boxme_ref: 'BX0100035', actual_weight: 8.00, total_fee: 50000, status: 'completed' },
    { tracking_no: 'TH00000007FL', boxme_ref: 'BX0100042', actual_weight: 1.30, total_fee: 24500, status: 'completed' },
    { tracking_no: 'TH00000008FL', boxme_ref: 'BX0100049', actual_weight: 4.55, total_fee: 32000, status: 'completed' },
    { tracking_no: 'TH00000009FL', boxme_ref: 'BX0100056', actual_weight: 6.30, total_fee: 42000, status: 'completed' },
    { tracking_no: 'TH00000010FL', boxme_ref: 'BX0100063', actual_weight: 1.20, total_fee: 18000, status: 'completed' },
    { tracking_no: 'TH00000011FL', boxme_ref: 'BX0100070', actual_weight: 9.40, total_fee: 58000, status: 'returned' },
    { tracking_no: 'TH00000012FL', boxme_ref: 'BX0100077', actual_weight: 3.80, total_fee: 30000, status: 'completed' },
    { tracking_no: 'TH00000013FL', boxme_ref: 'BX0100084', actual_weight: 12.00, total_fee: 75000, status: 'completed' },
    { tracking_no: 'TH00000014FL', boxme_ref: 'BX0100091', actual_weight: 5.60, total_fee: 36500, status: 'completed' },
    { tracking_no: 'TH00000015FL', boxme_ref: 'BX0100098', actual_weight: 7.50, total_fee: 46000, status: 'pending' },
    { tracking_no: 'TH00000016FL', boxme_ref: 'BX0100105', actual_weight: 3.50, total_fee: 28000, status: 'completed' },
    { tracking_no: 'TH00000017FL', boxme_ref: 'BX0100112', actual_weight: 4.20, total_fee: 33000, status: 'completed' },
    { tracking_no: 'TH00000018FL', boxme_ref: 'BX0100119', actual_weight: 5.80, total_fee: 40000, status: 'completed' },
    { tracking_no: 'TH00000019FL', boxme_ref: 'BX0100126', actual_weight: 2.80, total_fee: 24000, status: 'completed' },
    { tracking_no: 'TH00000020FL', boxme_ref: 'BX0100133', actual_weight: 8.30, total_fee: 50000, status: 'completed' },
    { tracking_no: 'TH00000050FL', boxme_ref: 'BX0200000', actual_weight: 2.50, total_fee: 22000, status: 'completed' },
    { tracking_no: 'TH00000051FL', boxme_ref: 'BX0200001', actual_weight: 3.80, total_fee: 30000, status: 'completed' },
    { tracking_no: 'TH00000052FL', boxme_ref: 'BX0200002', actual_weight: 5.10, total_fee: 38000, status: 'completed' },
    { tracking_no: 'TH00000053FL', boxme_ref: 'BX0200003', actual_weight: 1.90, total_fee: 19000, status: 'completed' },
    { tracking_no: 'TH00000054FL', boxme_ref: 'BX0200004', actual_weight: 4.40, total_fee: 34000, status: 'completed' },
  ];

  return { carrierData, carrierHeaders, boxmeData, boxmeHeaders };
}
