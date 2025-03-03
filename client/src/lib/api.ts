import axios from "axios";
export const HOST = "http://localhost:3000";

export const api = axios.create({
  baseURL: `${HOST}`,
  withCredentials: true,
});
