import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

// We import the Work type from the content layer so it stays consistent across
// the app. Both grid and slider components will use this.
import { Work } from '#site/content'

interface WorkCardProps {
  work: Work
}

export default function WorkCard({ work }: WorkCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="group relative block w-full h-full rounded-lg"
    >
      {/* make the entire card a cursor-target for custom cursor interactions */}
      <Link href={work.permalink} className="block h-full w-full cursor-target">
        <div className="block p-0! overflow-hidden border border-foreground/20 bg-card-bg transition-all duration-300 w-full h-full group-hover:bg-foreground/30 rounded-lg">
          {/* Image Container */}
          <div className="relative aspect-video w-full overflow-hidden bg-foreground/10 transition-shadow duration-300">
            {work.cover ? (
              // cover may be a string URL or an object with a src property
              <Image
                src={
                  typeof work.cover === 'object' &&
                  work.cover !== null &&
                  'src' in work.cover
                    ? (work.cover as { src: string }).src
                    : (work.cover as string)
                }
                alt={work.title}
                fill
                sizes="(max-width: 768px) 90vw, (max-width: 1200px) 45vw, 400px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono text-xs opacity-30 bg-pattern-grid">
                ¯\_(ツ)_/¯
              </div>
            )}
          </div>

          {/* Content */}
          <div className="mt-2 w-full text-left text-foreground p-4 flex flex-col h-full">
            <h3 className="text-2xl font-bold line-clamp-3">{work.title}</h3>
            {(work.author || work.date) && (
              <p className="text-sm opacity-70 mt-1">
                {work.author && (
                  <span className="text-primary-blue">{work.author}</span>
                )}
                {work.author && work.date && <span className="mx-2">|</span>}
                {work.date && <>{work.date}</>}
              </p>
            )}
            {work.description && (
              <p className="mt-1 text-sm opacity-90 line-clamp-3">
                {work.description}
              </p>
            )}
            {work.tags && work.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {work.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono border border-foreground/20 px-1 text-foreground/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// re-export type for convenience
export type { Work }
