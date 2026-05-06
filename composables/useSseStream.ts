export function useSseStream() {
  const loading = ref(false)
  const error = ref<string>()

  return {
    loading,
    error
  }
}
