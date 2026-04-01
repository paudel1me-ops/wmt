interface Props {
  label: string
  active: boolean
  onClick: () => void
}

export default function FilterChip({ label, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      data-testid="filter-chip"
      className={`px-3 py-1 rounded-full text-sm transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  )
}
