/** 将服务端 ISO 时间转换为浏览器本地时间展示。 */
export function useLocalDateTime() {
  function formatLocalDateTime(value?: string) {
    if (!value) {
      return '-'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleString()
  }

  return {
    formatLocalDateTime
  }
}
