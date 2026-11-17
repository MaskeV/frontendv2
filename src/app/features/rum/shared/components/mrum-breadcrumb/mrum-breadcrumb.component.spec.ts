import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MrumBreadcrumbComponent } from './mrum-breadcrumb.component';

describe('MrumBreadcrumbComponent', () => {
  let component: MrumBreadcrumbComponent;
  let fixture: ComponentFixture<MrumBreadcrumbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MrumBreadcrumbComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MrumBreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
