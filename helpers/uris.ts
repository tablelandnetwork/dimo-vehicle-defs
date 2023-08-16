import { init, __wasm } from "@tableland/sqlparser";

export async function normalize(sql: string) {
  if (__wasm == null) {
    await init();
  }
  return (await globalThis.sqlparser.normalize(sql)).statements[0];
}

export async function getURITemplate(
  tablelandHost: string,
  defsTable: string
): Promise<string[]> {
  const uri =
    tablelandHost +
    "/api/v1/query?format=objects&extract=true&unwrap=true&statement=" +
    encodeURIComponent(
      await normalize(
        `select 
          json_object(
            'name','VehicleId #ID',
            'attributes',json_array(
              json_object(
                'trait_type','device_type_id',
                'value',device_type_id
              ),
              json_object(
                'trait_type','make',
                'value',make
              ),
              json_object(
                'trait_type','make_token_id',
                'value',make_token_id,
                'display_type','number'
              ),
              json_object(
                'trait_type','oem_platform_name',
                'value',oem_platform_name
              ),
              json_object(
                'trait_type','model',
                'value',model
              ),
              json_object(
                'trait_type','year',
                'value',year,
                'display_type','number'
              ),
              json_object(
                'trait_type','model_style',
                'value',model_style
              ),
              json_object(
                'trait_type','model_sub_style',
                'value',model_sub_style
              )
            ),
            'metadata',json_extract(metadata,'$')
          )
        from
          ${defsTable}`
      )
    );
  return uri.split("ID");
}
