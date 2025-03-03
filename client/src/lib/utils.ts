import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import jsCookie from "js-cookie"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getCookie = (name: string) => {
  return jsCookie.get(name)
}
