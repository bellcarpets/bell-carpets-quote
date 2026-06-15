CREATE TABLE `admin_auth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`twoFactorSecret` varchar(64),
	`twoFactorEnabled` boolean NOT NULL DEFAULT false,
	`sessionToken` varchar(255),
	`sessionExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_auth_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`allDay` boolean NOT NULL DEFAULT false,
	`colour` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`role` varchar(100),
	`agencyId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`variables` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`invoiceNumber` varchar(50) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('unpaid','paid','overdue','cancelled') NOT NULL DEFAULT 'unpaid',
	`dueDate` timestamp,
	`paidAt` timestamp,
	`notes` text,
	`saasu_id` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `library_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `library_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) DEFAULT '0',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`tier` enum('good','better','best') NOT NULL,
	`label` varchar(50),
	`productName` varchar(255),
	`manufacturer` varchar(255),
	`fibre` varchar(100),
	`pileType` varchar(100),
	`price` decimal(10,2),
	`heroImageUrl` text,
	`productUrl` text,
	`primaryColour` varchar(100),
	`accentColour` varchar(100),
	`carpetColours` text,
	`badges` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteNumber` varchar(20) NOT NULL,
	`status` enum('draft','quote_sent','accepted','deposit_paid','scheduled','completed','invoice_paid','expired','archived') NOT NULL DEFAULT 'draft',
	`quoteType` enum('homeowner','agency_3tier','agency_single') NOT NULL DEFAULT 'homeowner',
	`temperature` enum('hot','warm','cold') NOT NULL DEFAULT 'warm',
	`clientName` varchar(255),
	`agentEmail` varchar(320),
	`agentPhone` varchar(50),
	`agencyId` int,
	`contactId` int,
	`propertyAddress` text,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`validDays` int NOT NULL DEFAULT 30,
	`expiryDate` timestamp,
	`discount` decimal(10,2) DEFAULT '0',
	`credit` decimal(10,2) DEFAULT '0',
	`paymentTermsDays` int NOT NULL DEFAULT 30,
	`scopeDescription` text,
	`customerNotes` text,
	`internalNotes` text,
	`insuranceAssessment` text,
	`underlayOption` enum('protect','ultimate','extra','eureka'),
	`viewCount` int NOT NULL DEFAULT 0,
	`emailedAt` timestamp,
	`selectedTier` enum('good','better','best'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_quoteNumber_unique` UNIQUE(`quoteNumber`)
);
