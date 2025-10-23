import { Loader2 } from 'lucide-react'

type LoadingIndicatorProps = {
  fullScreen?: boolean
}

export function LoadingIndicator({
  fullScreen = false
}: LoadingIndicatorProps) {
  return (
    <div
      className={[
        'flex items-center justify-center',
        fullScreen ? 'h-full w-full' : 'h-24 w-full'
      ].join(' ')}
    >
      <Loader2
        className='h-10 w-10 animate-spin text-muted-foreground duration-700'
        aria-hidden='true'
      />
      <span className='sr-only'>Loading</span>
    </div>
  )
}
