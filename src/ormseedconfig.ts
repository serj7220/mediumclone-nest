import {DataSource} from 'typeorm';

const ormseedconfig: DataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'mediumclone',
  password: '123456',
  database: 'mediumclone',
  synchronize: false,
  migrations: [__dirname + '/seeds/**/*{.ts,.js}'],
});

ormseedconfig
  .initialize()
  .then(() => {
    console.log(`Seed Data Source has been initialized`);
  })
  .catch((err) => {
    console.error(`Seed Data Source initialization error`, err);
  });

export default ormseedconfig;
