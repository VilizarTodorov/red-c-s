import { Migration } from '@mikro-orm/migrations';

export class Migration20210310153146 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "user" add column "email" text not null;');
  }

}
