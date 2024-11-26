import clsx from 'clsx'

export function Container({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={clsx(
        'mx-auto w-full max-w-[85vw]',
        className
      )}
      {...props}
    />
  )
}
