import { PieChart, Pie, Cell } from 'recharts';

export function MacroMiniPie({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <PieChart width={80} height={80}>
      <Pie data={data} dataKey="value" innerRadius={22} outerRadius={35} stroke="transparent">
        {data.map((d, i) => (
          <Cell key={i} fill={d.color} />
        ))}
      </Pie>
    </PieChart>
  );
}