import { Routes } from '@angular/router';
import { ChatPageComponent } from './pages/chat-page';
import { LoginPageComponent } from './pages/login-page';

export const routes: Routes = [
  { path: '', component: LoginPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'chat', component: ChatPageComponent },
];
