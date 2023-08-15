import * as fs from "fs";
import { parse } from "csv-parse";

export async function loadCSV<T>(
  filename: string,
  headers: string[],
  cast: (row: any) => T,
  offset: number = 0,
  limit?: number,
): Promise<T[]> {
  const parser = fs.createReadStream(filename).pipe(
    parse({
      delimiter: ",",
      columns: headers,
      fromLine: offset + 2,
    })
  );
  let i = 0;
  const rows: T[] = [];
  for await (const record of parser) {
    rows.push(cast(record));
    if (limit && i === limit - 1) {
      break;
    }
    i++;
  }
  return rows;
}
