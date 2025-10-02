import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  category: string;
  [key: string]: any;
}

interface CategoryPieChartProps {
  title: string;
  data: CategoryData[];
  colors: string[];
}

export function CategoryPieChart({ title, data, colors }: CategoryPieChartProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
    const RADIAN = Math.PI / 180;

    // % ใน pie chart
    const innerTextRadius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const innerTextX = cx + innerTextRadius * Math.cos(-midAngle * RADIAN);
    const innerTextY = cy + innerTextRadius * Math.sin(-midAngle * RADIAN);

    // เส้นชี้และ label ข้างนอก
    const radius = outerRadius + 40;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // คำนวณตำแหน่งสำหรับเส้นเชื่อม
    const lineRadius = outerRadius + 10;
    const lineX = cx + lineRadius * Math.cos(-midAngle * RADIAN);
    const lineY = cy + lineRadius * Math.sin(-midAngle * RADIAN);

    // แสดงเฉพาะที่มีสัดส่วนมากกว่า 2%
    if (percent < 0.02) return null;

    return (
      <g>
        {/* % ใน pie chart */}
        {percent > 0.03 && (
          <text
            x={innerTextX}
            y={innerTextY}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-xs font-light"
          >
            {`${(percent * 100).toFixed(0)}%`}
          </text>
        )}

        {/* เส้นเชื่อมจาก chart ไป label (เส้นตรง) */}
        <line
          x1={lineX}
          y1={lineY}
          x2={x}
          y2={y}
          stroke="#ccc"
          strokeWidth={0.5}
        />

        {/* ข้อความโดยไม่มีกรอบ */}
        <g>
          <text
            x={x}
            y={y - 5}
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            className="text-xs font-light fill-gray-600"
          >
            {name}
          </text>
          <text
            x={x}
            y={y + 7}
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            className="text-xs font-light fill-gray-500"
          >
            {formatAmount(value)}
          </text>
        </g>
      </g>
    );
  };

  if (!data.length) {
    return (
      <div className="bg-gray-50 border border-gray-100 p-8">
        <h3 className="text-lg font-thin text-black tracking-wide mb-4">{title}</h3>
        <div className="text-center py-12">
          <p className="text-sm font-light text-gray-400">ไม่มีข้อมูลในช่วงที่เลือก</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-100 p-6">
      <h3 className="text-lg font-thin text-black tracking-wide mb-6 text-center">{title}</h3>

      <div style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}