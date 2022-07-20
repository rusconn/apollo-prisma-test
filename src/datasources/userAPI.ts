import type * as Prisma from "@prisma/client";
import type { GraphQLResolveInfo } from "graphql";
import {
  ConnectionArguments,
  findManyCursorConnection,
} from "@devoxa/prisma-relay-cursor-connection";

import { ParseError } from "@/errors";
import { OrderDirection, User, UserOrderField } from "@/types";
import { isUserId, parseConnectionArgs, userId } from "@/utils";
import { PrismaDataSource } from "./abstracts";
import { NotFoundError } from "./errors";

type GetsParseParams = ConnectionArguments & {
  orderBy?: {
    field: UserOrderField;
    direction: OrderDirection;
  } | null;
};

type GetParseParams = {
  id: User["id"];
};

type CreateParseParams = {
  name: User["name"];
};

type UpdateParseParams = {
  id: User["id"];
  name?: User["name"] | null;
};

type DeleteParseParams = {
  id: User["id"];
};

export class UserAPI extends PrismaDataSource {
  static gets(args: GetsParseParams) {
    const { orderBy, ...connectionArgs } = args;

    const { first, last, before, after } = parseConnectionArgs(connectionArgs);

    if (first && first > 30) {
      throw new ParseError("`first` must be up to 30");
    }

    if (last && last > 30) {
      throw new ParseError("`last` must be up to 30");
    }

    if (before && !isUserId(before)) {
      throw new ParseError("invalid `before`");
    }

    if (after && !isUserId(after)) {
      throw new ParseError("invalid `after`");
    }

    const defaultedConnectionArgs =
      first == null && last == null
        ? { first: 10, last, before, after }
        : { first, last, before, after };

    const directionToUse = orderBy?.direction === OrderDirection.Asc ? "asc" : "desc";

    const orderByToUse: Exclude<Prisma.Prisma.UserFindManyArgs["orderBy"], undefined> =
      orderBy?.field === UserOrderField.UpdatedAt
        ? [{ updatedAt: directionToUse }, { id: directionToUse }]
        : [{ createdAt: directionToUse }, { id: directionToUse }];

    return { ...defaultedConnectionArgs, orderBy: orderByToUse };
  }

  static get(args: GetParseParams) {
    const { id } = args;

    if (!isUserId(id)) {
      throw new ParseError("invalid `id`");
    }

    return { id };
  }

  static create(args: CreateParseParams) {
    const { name } = args;

    if ([...name].length > 100) {
      throw new ParseError("`name` must be up to 100 characteres");
    }

    return { name };
  }

  static update(args: UpdateParseParams) {
    const { id, name } = args;

    if (name === null) {
      throw new ParseError("`name` must be not null");
    }

    if (name && [...name].length > 100) {
      throw new ParseError("`name` must be up to 100 characteres");
    }

    if (!isUserId(id)) {
      throw new ParseError("invalid `id`");
    }

    return { id, name };
  }

  static delete(args: DeleteParseParams) {
    const { id } = args;

    if (!isUserId(id)) {
      throw new ParseError("invalid `id`");
    }

    return { id };
  }

  async gets({
    info,
    orderBy,
    ...paginationArgs
  }: ReturnType<typeof UserAPI.gets> & { info: GraphQLResolveInfo }) {
    return findManyCursorConnection<Prisma.User>(
      args => this.prisma.user.findMany({ ...args, orderBy }),
      () => this.prisma.user.count(),
      paginationArgs,
      { resolveInfo: info }
    );
  }

  async get({ id }: ReturnType<typeof UserAPI.get>) {
    const result = await this.prisma.user.findUnique({ where: { id } });

    if (!result) {
      throw new NotFoundError("Not found");
    }

    return result;
  }

  async create(data: ReturnType<typeof UserAPI.create>) {
    return this.prisma.user.create({ data: { id: userId(), ...data } });
  }

  async update({ id, ...data }: ReturnType<typeof UserAPI.update>) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete({ id }: ReturnType<typeof UserAPI.delete>) {
    return this.prisma.user.delete({ where: { id } });
  }
}
