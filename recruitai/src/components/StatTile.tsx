export default function StatTile({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm mb-2 ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}
