import type * as Prisma from "@prisma/client";
import type { GraphQLResolveInfo } from "graphql";
import {
  ConnectionArguments,
  findManyCursorConnection,
} from "@devoxa/prisma-relay-cursor-connection";

import { ParseError } from "@/errors";
import { OrderDirection, Todo, TodoOrderField, User } from "@/types";
import { isTodoId, isUserId, parseConnectionArgs, todoId } from "@/utils";
import { PrismaDataSource } from "./abstracts";
import { NotFoundError } from "./errors";

type GetUserTodosParseParams = ConnectionArguments & {
  userId: User["id"];
  orderBy?: {
    field: TodoOrderField;
    direction: OrderDirection;
  } | null;
};

type GetParseParams = {
  id: Todo["id"];
};

type CreateParseParams = {
  userId: User["id"];
  title: Todo["title"] | null;
  description?: Todo["description"] | null;
};

type UpdateParseParams = {
  id: Todo["id"];
  title?: Todo["title"] | null;
  description?: Todo["description"] | null;
  status?: Todo["status"] | null;
};

type DeleteParseParams = {
  id: Todo["id"];
};

export class TodoAPI extends PrismaDataSource {
  static getsUserTodos(args: GetUserTodosParseParams) {
    const { userId, orderBy, ...connectionArgs } = args;

    const { first, last, before, after } = parseConnectionArgs(connectionArgs);

    if (first && first > 50) {
      throw new ParseError("`first` must be up to 50");
    }

    if (last && last > 50) {
      throw new ParseError("`last` must be up to 50");
    }

    if (before && !isTodoId(before)) {
      throw new ParseError("invalid `before`");
    }

    if (after && !isTodoId(after)) {
      throw new ParseError("invalid `after`");
    }

    if (!isUserId(userId)) {
      throw new ParseError("invalid `userId`");
    }

    const defaultedConnectionArgs =
      first == null && last == null
        ? { first: 20, last, before, after }
        : { first, last, before, after };

    const directionToUse = orderBy?.direction === OrderDirection.Asc ? "asc" : "desc";

    const orderByToUse: Exclude<Prisma.Prisma.TodoFindManyArgs["orderBy"], undefined> =
      orderBy?.field === TodoOrderField.CreatedAt
        ? [{ createdAt: directionToUse }, { id: directionToUse }]
        : [{ updatedAt: directionToUse }, { id: directionToUse }];

    return { ...defaultedConnectionArgs, userId, orderBy: orderByToUse };
  }

  static get(args: GetParseParams) {
    const { id } = args;

    if (!isTodoId(id)) {
      throw new ParseError("invalid `id`");
    }

    return { id };
  }

  static create(args: CreateParseParams) {
    const { userId, title, description } = args;

    if (title === null) {
      throw new ParseError("`title` must be not null");
    }

    if (description === null) {
      throw new ParseError("`description` must be not null");
    }

    if (title && [...title].length > 100) {
      throw new ParseError("`title` must be up to 100 characters");
    }

    if (description && [...description].length > 5000) {
      throw new ParseError("`description` must be up to 5000 characters");
    }

    if (!isUserId(userId)) {
      throw new ParseError("invalid `userId`");
    }

    return { userId, title, description };
  }

  static update(args: UpdateParseParams) {
    const { id, title, description, status } = args;

    if (title === null) {
      throw new ParseError("`title` must be not null");
    }

    if (description === null) {
      throw new ParseError("`description` must be not null");
    }

    if (status === null) {
      throw new ParseError("`status` must be not null");
    }

    if (title && [...title].length > 100) {
      throw new ParseError("`title` must be up to 100 characters");
    }

    if (description && [...description].length > 5000) {
      throw new ParseError("`description` must be up to 5000 characters");
    }

    if (!isTodoId(id)) {
      throw new ParseError("invalid `id`");
    }

    return { id, title, description, status };
  }

  static delete(args: DeleteParseParams) {
    const { id } = args;

    if (!isTodoId(id)) {
      throw new ParseError("invalid `id`");
    }

    return { id };
  }

  async getsUserTodos({
    userId,
    info,
    orderBy,
    ...paginationArgs
  }: ReturnType<typeof TodoAPI.getsUserTodos> & { info: GraphQLResolveInfo }) {
    const userPromise = this.prisma.user.findUnique({
      where: { id: userId },
    });

    return findManyCursorConnection<Prisma.Todo, Pick<Prisma.Todo, "id">>(
      async args => {
        // prisma の型が間違っている
        // https://github.com/prisma/prisma/issues/10687
        const todos = (await userPromise.todos({ ...args, orderBy })) as Prisma.Todo[] | null;

        if (!todos) {
          throw new NotFoundError("user not found");
        }

        return todos;
      },
      async () => {
        const todos = (await userPromise.todos()) as Prisma.Todo[] | null;

        if (!todos) {
          throw new NotFoundError("user not found");
        }

        return todos.length;
      },
      paginationArgs,
      { resolveInfo: info }
    );
  }

  async get({ id }: ReturnType<typeof TodoAPI.get>) {
    const result = await this.prisma.todo.findUnique({ where: { id } });

    if (!result) {
      throw new NotFoundError("Not found");
    }

    return result;
  }

  async create({ userId, ...data }: ReturnType<typeof TodoAPI.create>) {
    return this.prisma.todo.create({ data: { id: todoId(), ...data, userId } });
  }

  async update({ id, ...data }: ReturnType<typeof TodoAPI.update>) {
    return this.prisma.todo.update({ where: { id }, data });
  }

  async delete({ id }: ReturnType<typeof TodoAPI.delete>) {
    return this.prisma.todo.delete({ where: { id } });
  }
}
