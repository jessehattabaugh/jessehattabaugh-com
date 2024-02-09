interface DocumentTransition {
	start(callback: () => void): Promise<void>;
	setElement(element: Element, tag: string, options?: any): void;
	abandon(): void;
}

declare global {
	interface Document {
		documentTransition: DocumentTransition;
	}
}

export type FetchDetails = {
	cached: ?boolean;
	contentType: ?string;
	data: ?(string | any);
	error: ?string;
	id: string;
	isPrefetch: boolean;
	options: RequestInit;
	response: ?Response;
	status: ?number;
	url: URL;
};

export interface FetchMouseEvent extends MouseEvent {
	type: 'click' | 'mouseover';
}