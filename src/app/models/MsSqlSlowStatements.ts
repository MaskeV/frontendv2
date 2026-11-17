export class MsSqlSlowStatements {
    user: string | undefined;
    query: string | undefined;
    clientHost: string | undefined;
    clientApp: string | undefined;
    database: string | undefined;
    latency: number | undefined;
    executionTime: string | undefined;
}
