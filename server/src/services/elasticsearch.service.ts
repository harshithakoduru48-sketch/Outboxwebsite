import { Client } from '@elastic/elasticsearch';
import { config } from '../config';

let client: Client | null = null;
let isConnected = false;

export function getElasticsearchClient(): Client {
  if (!client) {
    client = new Client({
      node: config.elasticsearch.node,
      requestTimeout: 3000,
    });
  }
  return client;
}

export async function initElasticsearch(): Promise<boolean> {
  const es = getElasticsearchClient();
  try {
    const pingResult = await es.ping();
    if (pingResult) {
      isConnected = true;
      console.log(`[Elasticsearch] Connected to ${config.elasticsearch.node}`);

      const exists = await es.indices.exists({ index: config.elasticsearch.index });
      if (!exists) {
        await es.indices.create({
          index: config.elasticsearch.index,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                senderId: { type: 'keyword' },
                senderEmail: { type: 'keyword' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`[Elasticsearch] Created index '${config.elasticsearch.index}'`);
      }
      return true;
    }
  } catch (error: any) {
    isConnected = false;
    console.warn(`[Elasticsearch] Warning: Elasticsearch at ${config.elasticsearch.node} is not reachable (${error.message}). Search will gracefully fallback to database queries.`);
    return false;
  }
  return false;
}

export async function indexEmailDocument(data: {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  senderId: string;
  senderEmail?: string;
  createdAt: Date;
}) {
  if (!isConnected) return;
  const es = getElasticsearchClient();
  try {
    await es.index({
      index: config.elasticsearch.index,
      id: data.id,
      document: {
        id: data.id,
        recipientEmail: data.recipientEmail,
        subject: data.subject,
        body: data.body,
        status: data.status,
        scheduledAt: data.scheduledAt.toISOString(),
        sentAt: data.sentAt ? data.sentAt.toISOString() : null,
        senderId: data.senderId,
        senderEmail: data.senderEmail,
        createdAt: data.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`[Elasticsearch] Failed to index document ${data.id}:`, error.message);
  }
}

export async function updateEmailDocumentStatus(id: string, status: string, sentAt?: Date | null) {
  if (!isConnected) return;
  const es = getElasticsearchClient();
  try {
    await es.update({
      index: config.elasticsearch.index,
      id,
      doc: {
        status,
        sentAt: sentAt ? sentAt.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error(`[Elasticsearch] Failed to update document status ${id}:`, error.message);
  }
}

export async function searchEmailsInEs(queryString: string, statusFilter?: string) {
  if (!isConnected) return null;
  const es = getElasticsearchClient();
  try {
    const mustQueries: any[] = [];

    if (queryString && queryString.trim().length > 0) {
      mustQueries.push({
        multi_match: {
          query: queryString,
          fields: ['recipientEmail^3', 'subject^2', 'body', 'senderEmail'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (statusFilter && statusFilter !== 'ALL') {
      mustQueries.push({
        term: { status: statusFilter },
      });
    }

    const result = await es.search({
      index: config.elasticsearch.index,
      body: {
        query: mustQueries.length > 0 ? { bool: { must: mustQueries } } : { match_all: {} },
        sort: [{ createdAt: { order: 'desc' } }],
        size: 100,
      },
    });

    return result.hits.hits.map((hit: any) => hit._source);
  } catch (error: any) {
    console.error('[Elasticsearch] Search query error:', error.message);
    return null;
  }
}
