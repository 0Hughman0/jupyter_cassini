/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
    "/lookup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lookup a tier
         * @description Look up a tier by name and respond with info about it.
         */
        get: {
            parameters: {
                query: {
                    name: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Tier Found */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TierInfo"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * View the tier tree
         * @description Get the children of a particular tier (or home)
         */
        get: {
            parameters: {
                query?: {
                    ids?: unknown[];
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Found tree */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TreeResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/open": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Open a tier in file explorer
         * @description Use `tier.open_folder()` python side on specified tier.
         */
        get: {
            parameters: {
                query?: {
                    name?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Open successful */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": boolean;
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/newChild": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a new child
         * @description Create a new child
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["NewChildInfo"];
                };
            };
            responses: {
                /** @description Child made */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TreeResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        TierInfo: {
            name: string;
            identifiers: string[];
            /** Format: date-time */
            started?: string;
            children: string[];
        };
        ChildClsInfo: {
            name: string;
            idRegex: string;
            namePartTemplate: string;
            templates: string[];
            metaNames: string[];
        };
        TreeChildResponse: {
            name: string;
            info?: string;
            outcome?: string;
            /** Format: date-time */
            started?: string;
            hltsPath?: string;
            metaPath?: string;
            notebookPath?: string;
            additionalMeta: {
                [key: string]: unknown;
            };
        };
        TreeResponse: {
            folder: string;
            childClsInfo?: components["schemas"]["ChildClsInfo"];
            children: {
                name?: string;
            } & {
                [key: string]: components["schemas"]["TreeChildResponse"];
            };
        } & WithRequired<components["schemas"]["TreeChildResponse"], "name">;
        NewChildInfo: {
            id: string;
            parent: string;
            template: string;
            description: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
type WithRequired<T, K extends keyof T> = T & {
    [P in K]-?: T[P];
};
export type operations = Record<string, never>;
