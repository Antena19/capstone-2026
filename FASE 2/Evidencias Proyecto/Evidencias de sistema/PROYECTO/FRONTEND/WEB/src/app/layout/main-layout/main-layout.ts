import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FeedbackToast } from '../../shared/components/feedback-toast/feedback-toast';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Topbar, FeedbackToast],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {}
