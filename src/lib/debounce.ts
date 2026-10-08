export function debounce<T extends (...args: any[]) => void>(
  callback: T,

  delay: number,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => callback(...args), delay)
  }

  debounced.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)

      timeoutId = undefined
    }
  }

  return debounced
}
