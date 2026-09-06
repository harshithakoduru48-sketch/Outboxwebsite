import { Readable } from 'stream';
import csvParser from 'csv-parser';

export function extractEmailsFromText(text: string): string[] {
  // Regex to match valid emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  // Return unique, trimmed, lowercase emails
  return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
}

export async function parseCsvFile(buffer: Buffer): Promise<string[]> {
  const emails: Set<string> = new Set();
  const textContent = buffer.toString('utf-8');

  return new Promise((resolve) => {
    const stream = Readable.from(buffer);

    stream
      .pipe(csvParser())
      .on('data', (row) => {
        // Inspect row values for email patterns
        for (const key of Object.keys(row)) {
          const val = row[key];
          if (typeof val === 'string') {
            const found = extractEmailsFromText(val);
            found.forEach((e) => emails.add(e));
          }
        }
      })
      .on('end', () => {
        // If CSV parsing didn't find emails (or it's plain text), fallback to regex across whole buffer
        if (emails.size === 0) {
          const rawFound = extractEmailsFromText(textContent);
          rawFound.forEach((e) => emails.add(e));
        }
        resolve(Array.from(emails));
      })
      .on('error', () => {
        // Fallback on error to raw text regex
        const rawFound = extractEmailsFromText(textContent);
        resolve(rawFound);
      });
  });
}
