import { TodoApiLive } from "../services/TodoApi";
import { makeTodoAtoms } from "./todoAtoms";

export const todoAtoms = makeTodoAtoms(TodoApiLive);
