import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'condition',
    loadComponent: () => import('./condition/condition.component').then(m => m.ConditionComponent),
  },
  {
    path: 'strength',
    loadComponent: () => import('./strength/strength.component').then(m => m.StrengthComponent),
  },
  { path: '**', redirectTo: '' },
];
