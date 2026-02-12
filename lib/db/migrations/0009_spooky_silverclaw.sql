CREATE INDEX "idx_chat_userId" ON "Chat" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_document_userId" ON "Document" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_message_v2_chatId_createdAt" ON "Message_v2" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_stream_chatId" ON "Stream" USING btree ("chatId");