import { UserService } from './user.service';
import { db } from '../../config/database';

async function testUserService() {
  const userService = new UserService();
  
  console.log('Testing User Service...\n');
  
  try {
    // Test 1: Register a new user
    console.log('1. Testing user registration...');
    const registerResult = await userService.register({
      email: 'test@example.com',
      password: 'TestPassword123',
      name: 'Test User',
    });
    
    if (registerResult.success) {
      console.log('✅ User registered successfully');
      console.log('User ID:', registerResult.data?.user.id);
      console.log('Token:', registerResult.data?.token.substring(0, 20) + '...');
    } else {
      console.log('❌ Registration failed:', registerResult.error);
    }
    
    // Test 2: Login
    console.log('\n2. Testing user login...');
    const loginResult = await userService.login({
      email: 'test@example.com',
      password: 'TestPassword123',
    });
    
    if (loginResult.success) {
      console.log('✅ Login successful');
      const userId = loginResult.data?.user.id;
      
      // Test 3: Get credit balance
      console.log('\n3. Testing credit balance...');
      const creditResult = await userService.getCreditBalance(userId!);
      
      if (creditResult.success) {
        console.log('✅ Credit balance retrieved');
        console.log('Total credits:', creditResult.data?.total);
        console.log('Remaining credits:', creditResult.data?.remaining);
      }
      
      // Test 4: Use credits
      console.log('\n4. Testing credit usage...');
      const useResult = await userService.useCredits(userId!, {
        amount: 10,
        description: 'Test usage',
      });
      
      if (useResult.success) {
        console.log('✅ Credits used successfully');
        console.log('New remaining:', useResult.data?.remaining);
      }
      
      // Cleanup: Delete test user
      console.log('\n5. Cleaning up test user...');
      await userService.deleteUser(userId!);
      console.log('✅ Test user deleted');
      
    } else {
      console.log('❌ Login failed:', loginResult.error);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run tests only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUserService();
}