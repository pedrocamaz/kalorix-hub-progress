import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function MacroMiniPie({ data }: { data: { name: string; value: number; color: string }[] }) {
  // Filter out zero values to avoid rendering issues
  const validData = data.filter(d => d.value > 0);
  
  if (validData.length === 0) {
    return (
      <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded-full">
        <span className="text-xs text-gray-400">N/A</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width={80} height={80}>
      <PieChart>
        <Pie 
          data={validData} 
          dataKey="value" 
          cx="50%" 
          cy="50%" 
          innerRadius={22} 
          outerRadius={35} 
          stroke="transparent"
          paddingAngle={2}
        >
          {validData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}