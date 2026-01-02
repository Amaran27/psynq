import AppDataSource from '../data-source';

async function check() {
  await AppDataSource.initialize();

  const endpoints = await AppDataSource.query(
    "SELECT id, encode(id::bytea, 'hex') as hex_id FROM ps_endpoints",
  );
  console.log('Endpoints HEX check:');
  endpoints.forEach((row) => {
    console.log(`ID: "${row.id}", HEX: ${row.hex_id}`);
  });

  const auths = await AppDataSource.query(
    "SELECT id, encode(id::bytea, 'hex') as hex_id, username, encode(username::bytea, 'hex') as hex_user FROM ps_auths",
  );
  console.log('Auths HEX check:');
  auths.forEach((row) => {
    console.log(
      `ID: "${row.id}", HEX: ${row.hex_id}, User: "${row.username}", UserHEX: ${row.hex_user}`,
    );
  });

  await AppDataSource.destroy();
}

check().catch(console.error);
