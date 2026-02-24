import { Work } from '#site/content'
import WorksSlider from './WorksSlider'

interface HomeWorksProps {
  works: Work[]
}

export default function HomeWorks({ works }: HomeWorksProps) {
  return (
    <section className="py-8 relative overflow-hidden">
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex items-center justify-between border-b border-foreground pb-2">
          <h2 className="text-4xl md:text-5xl font-mono tracking-tighter">
            <span data-text="最新の作品">おすすめの作品</span>
          </h2>
        </div>
        <WorksSlider works={works} />
      </div>
    </section>
  )
}
