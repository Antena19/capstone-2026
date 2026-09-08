import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-feedback-toast',
  templateUrl: './feedback-toast.html',
  styleUrl: './feedback-toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackToast {
  readonly feedback = inject(FeedbackService);
}
