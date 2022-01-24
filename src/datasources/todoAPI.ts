import type * as Prisma from "@prisma/client";
import { findManyCursorConnection } from "@devoxa/prisma-relay-cursor-connection";

import {
  CreateTodoInput,
  QueryTodosArgs,
  SortDirection,
  Todo,
  UpdateTodoInput,
  User,
  UserTodosArgs,
} from "@/types";
import { mapConnectionIds, toTodoId, toTodoNodeId, toUserId } from "@/utils";
import { PrismaDataSource } from "./abstracts";
import { catchPrismaError } from "./decorators";
import { ValidationError, NotFoundError, DataSourceError } from "./errors";

export class TodoAPI extends PrismaDataSource {
  getsUserTodos(id: User["id"], args: UserTodosArgs) {
    return this.getsByUserId({ ...args, userId: id });
  }

  async getsByUserId({ userId: nodeId, ...rest }: QueryTodosArgs) {
    const id = toUserId(nodeId);

    try {
      return await this.getsByUserIdCore(id, rest);
    } catch (e) {
      // 多分 findManyCursorConnection のバリデーションエラー
      if (!(e instanceof DataSourceError) && e instanceof Error) {
        throw new ValidationError(e.message, e);
      }

      throw e;
    }
  }

  @catchPrismaError
  private async getsByUserIdCore(
    userId: Prisma.User["id"],
    { order, ...paginationArgs }: Omit<QueryTodosArgs, "userId">
  ) {
    const defaultedPaginationArgs =
      paginationArgs.first == null && paginationArgs.last == null
        ? { ...paginationArgs, first: 20 }
        : paginationArgs;

    const direction = order === SortDirection.Asc ? "asc" : "desc";

    const result = await findManyCursorConnection<Prisma.Todo, Pick<Prisma.Todo, "id">>(
      async args => {
        // prisma の型が間違っている
        // https://github.com/prisma/prisma/issues/10687
        const todos = (await this.prisma.user.findUnique({ where: { id: userId } }).todos({
          ...args,
          orderBy: [{ updatedAt: direction }, { id: direction }],
        })) as Prisma.Todo[] | null;

        if (!todos) {
          throw new NotFoundError("user not found");
        }

        return todos;
      },
      () => this.prisma.todo.count({ where: { userId } }),
      defaultedPaginationArgs,
      {
        getCursor: record => ({ id: record.id }),
        encodeCursor: ({ id }) => toTodoNodeId(id),
        decodeCursor: cursor => ({ id: toTodoId(cursor) }),
      }
    );

    return mapConnectionIds(result, toTodoNodeId);
  }

  @catchPrismaError
  async get(nodeId: Todo["id"]) {
    const id = toTodoId(nodeId);
    const result = await this.prisma.todo.findUnique({ where: { id } });
    return result && { ...result, id: toTodoNodeId(result.id) };
  }

  @catchPrismaError
  async create(nodeId: User["id"], input: CreateTodoInput) {
    const id = toUserId(nodeId);
    const result = await this.prisma.todo.create({ data: { ...input, userId: id } });
    return { ...result, id: toTodoNodeId(result.id) };
  }

  @catchPrismaError
  async update(nodeId: Todo["id"], input: UpdateTodoInput) {
    const id = toTodoId(nodeId);
    const result = await this.prisma.todo.update({ where: { id }, data: input });
    return { ...result, id: toTodoNodeId(result.id) };
  }

  @catchPrismaError
  async delete(nodeId: Todo["id"]) {
    const id = toTodoId(nodeId);
    const result = await this.prisma.todo.delete({ where: { id } });
    return { ...result, id: toTodoNodeId(result.id) };
  }
}
