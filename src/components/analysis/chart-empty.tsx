/** Placeholder shown inside a chart card when there is no data to plot. */
export function ChartEmpty({ message = 'No data', height = 200 }: { message?: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height }}
    >
      {message}
    </div>
  )
}
