import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientAppMappingComponent } from './client-app-mapping.component';

describe('ClientAppMappingComponent', () => {
  let component: ClientAppMappingComponent;
  let fixture: ComponentFixture<ClientAppMappingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientAppMappingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientAppMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
