/** «1 tarea», «0 tareas», «31 tareas»: el número con su sustantivo en la forma que le toca. */
export const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`
