import { Injectable, Logger } from '@nestjs/common';
import { Observable, ReplaySubject } from 'rxjs';

interface SseEvent {
  data: any;
  type?: string;
  id?: string;
  retry?: number;
}

interface SseStream {
  subject: ReplaySubject<SseEvent>;
  count: number;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly clients = new Map<string, SseStream>();

  // Create a new stream for a given jobId or connect to an existing one
  createSseStream(jobId: string): Observable<SseEvent> {
    this.logger.log(`Client connecting to SSE for jobId: ${jobId}`);

    if (!this.clients.has(jobId)) {
      const subject = new ReplaySubject<SseEvent>(1);
      this.clients.set(jobId, { subject, count: 0 });
      this.logger.log(`New SSE stream created for jobId: ${jobId}`);

      // Subscribe to the subject's completion/error to clean up the map entry
      subject.subscribe({
        complete: () => {
          this.logger.log(
            `SSE stream explicitly completed for jobId: ${jobId}`,
          );
          this.clients.delete(jobId);
        },
        error: (err) => {
          this.logger.error(
            `SSE stream error for jobId: ${jobId}: ${err.message}`,
          );
          this.clients.delete(jobId);
        },
      });
    }

    const stream = this.clients.get(jobId)!;
    stream.count++;
    this.logger.log(
      `Client attached to jobId: ${jobId}. Total clients: ${stream.count}`,
    );
    return stream.subject.asObservable();
  }

  // Must be called by the controller when a client disconnects
  handleDisconnect(jobId: string) {
    const stream = this.clients.get(jobId);
    if (stream) {
      stream.count--;
      this.logger.log(
        `Client detached from jobId: ${jobId}. Total clients: ${stream.count}`,
      );
      // The stream is intentionally not completed here.
      // Its lifecycle is tied to the job, which must explicitly call completeStream().
    }
  }

  // Send an event to a specific jobId's stream
  sendEvent(jobId: string, eventName: string, data: any) {
    const stream = this.clients.get(jobId);
    if (stream) {
      this.logger.log(`Sending event '${eventName}' to jobId: ${jobId}`);
      stream.subject.next({ type: eventName, data: data });
    } else {
      this.logger.warn(
        `No active SSE client for jobId: ${jobId} to send event '${eventName}'.`,
      );
    }
  }

  // Complete a stream (e.g., when job is finished)
  completeStream(jobId: string) {
    const stream = this.clients.get(jobId);
    if (stream) {
      this.logger.log(`Completing SSE stream for jobId: ${jobId}`);
      stream.subject.complete();
    }
  }
}
