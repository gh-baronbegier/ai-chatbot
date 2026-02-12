-- Drop foreign key constraints referencing Chat.id
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_chatId_Chat_id_fk";--> statement-breakpoint
ALTER TABLE "Message_v2" DROP CONSTRAINT IF EXISTS "Message_v2_chatId_Chat_id_fk";--> statement-breakpoint
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_chatId_Chat_id_fk";--> statement-breakpoint
ALTER TABLE "Vote_v2" DROP CONSTRAINT IF EXISTS "Vote_v2_chatId_Chat_id_fk";--> statement-breakpoint
ALTER TABLE "Stream" DROP CONSTRAINT IF EXISTS "Stream_chatId_Chat_id_fk";--> statement-breakpoint

-- Change Chat.id from uuid to text
ALTER TABLE "Chat" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Chat" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint

-- Change all chatId FK columns from uuid to text
ALTER TABLE "Message" ALTER COLUMN "chatId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Message_v2" ALTER COLUMN "chatId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Vote" ALTER COLUMN "chatId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Vote_v2" ALTER COLUMN "chatId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Stream" ALTER COLUMN "chatId" SET DATA TYPE text;--> statement-breakpoint

-- Re-add foreign key constraints
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
