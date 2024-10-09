import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MediaService } from './media-attachment.service';

@Processor('media-processing')
export class MediaProcessingService {
  constructor(private readonly mediaService: MediaService) {}

  @Process('process-media')
  async handleMediaProcessing(job: Job) {
    const { mediaId, filePath, thumbnailFilePath, description, focus } =
      job.data;

    try {
      await this.mediaService.processAsynchronously(
        mediaId,
        filePath,
        thumbnailFilePath,
        description,
        focus,
      );
    } catch (error) {
      console.error('Error processing media:', error);
      // Update the media attachment status to indicate failure
      await this.mediaService.updateMediaProcessingStatus(mediaId, 'failed');
    }
  }
}
