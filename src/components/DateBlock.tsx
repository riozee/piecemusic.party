interface DateBlockProps {
  date: string
  size?: string | number
  textColor?: string
  backgroundColor?: string
}

export default function DateBlock({
  date,
  size = '4rem',
  textColor,
  backgroundColor,
}: DateBlockProps) {
  const dateObj = new Date(date)
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const day = dateObj.getDate().toString().padStart(2, '0')
  const year = dateObj.getFullYear().toString()

  // Japanese weekday characters starting with Sunday
  const jpnWeekdays = ['日', '月', '火', '水', '木', '金', '土']
  const weekday = jpnWeekdays[dateObj.getDay()]

  // convert size to a valid CSS length string for calculations
  const sizeCss = typeof size === 'number' ? `${size}px` : size

  // relative font sizes
  const yearFont = `calc(${sizeCss} * 0.18)`
  const dayFont = `calc(${sizeCss} * 0.3)`
  const weekdayFont = `calc(${sizeCss} * 0.18)`

  // Conditionally apply default Tailwind classes to avoid specificity clashes
  const defaultBg = !backgroundColor ? 'bg-foreground/5' : ''
  const defaultText = !textColor ? 'text-foreground' : ''

  return (
    <div
      className={`relative flex font-mono font-bold shrink-0 items-center justify-center text-center transition-all hover:rounded-[20%] ${defaultBg} ${defaultText}`}
      style={{
        width: size,
        height: size,
        ...(backgroundColor ? { backgroundColor } : {}),
        ...(textColor ? { color: textColor } : {}),
      }}
      aria-label={`${month}/${day}/${year} (${weekday}曜日)`}
    >
      {/* year at top center */}
      <div
        className="absolute top-1 opacity-70 w-full"
        style={{ fontSize: yearFont }}
      >
        {year}
      </div>

      {/* center group for month/day */}
      <div className="flex items-center justify-center h-full pt-1">
        <div
          className="font-semibold leading-none"
          style={{ fontSize: dayFont }}
        >
          {month}/{day}
        </div>
      </div>

      {/* weekday at bottom center */}
      <div
        className="absolute bottom-0 opacity-70 w-full"
        style={{ fontSize: weekdayFont }}
      >
        {weekday}
      </div>
    </div>
  )
}
