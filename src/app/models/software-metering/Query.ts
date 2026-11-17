import { QueryPlatform } from "../enums/QueryPlatform";

export class Query {
  id: number | undefined;
  name: string | undefined;
  description: string | undefined;
  query: string = "";
  platform: QueryPlatform | undefined;
}
